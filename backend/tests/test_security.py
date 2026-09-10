"""Isolated synthetic security regressions, without sockets or production data."""
import asyncio
import json
import secrets
from datetime import date, timedelta
from http.cookies import SimpleCookie

import pytest
from openpyxl import load_workbook
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, settings
from app.core.security import hash_password, verify_password
from app.core.sessions import now_utc, token_hash
from app.db.session import Base, get_db
from app.main import create_app
from app.models import AuditLog, SavedUrgencyRoutePlan, User, UserSession
from app.services import planning

ORIGIN = "http://localhost:5173"
PASSWORD = "Synthetic-test-password-only!"


class Client:
    def __init__(self, app):
        self.app, self.cookies, self.csrf = app, {}, ""

    def call(self, method, path, body=None, *, csrf=True, origin=ORIGIN, headers=None, raw=None):
        async def run():
            pairs = {"host": "localhost:8000", **(headers or {})}
            if origin is not None:
                pairs["origin"] = origin
            if self.cookies:
                pairs["cookie"] = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
            if csrf and self.csrf:
                pairs["x-csrf-token"] = self.csrf
            data = raw if raw is not None else json.dumps(body).encode() if body is not None else b""
            if body is not None:
                pairs["content-type"] = "application/json"
            scope = {"type": "http", "asgi": {"version": "3.0", "spec_version": "2.4"},
                     "http_version": "1.1", "method": method, "scheme": "http", "path": path,
                     "raw_path": path.encode(), "query_string": b"", "root_path": "",
                     "headers": [(k.encode(), v.encode()) for k, v in pairs.items()],
                     "client": ("127.0.0.1", 1234), "server": ("localhost", 8000)}
            sent, delivered = [], False

            async def receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": data, "more_body": False}
                await asyncio.Event().wait()

            async def send(message):
                sent.append(message)

            await asyncio.wait_for(self.app(scope, receive, send), timeout=10)
            start = next(item for item in sent if item["type"] == "http.response.start")
            raw_headers = [(k.decode(), v.decode()) for k, v in start["headers"]]
            for name, value in raw_headers:
                if name == "set-cookie":
                    for key, morsel in SimpleCookie(value).items():
                        if morsel["max-age"] == "0":
                            self.cookies.pop(key, None)
                        else:
                            self.cookies[key] = morsel.value
            payload = b"".join(item.get("body", b"") for item in sent if item["type"] == "http.response.body")
            response_headers = dict(raw_headers)
            result = json.loads(payload) if payload and "application/json" in response_headers.get("content-type", "") else payload
            if start["status"] < 300 and isinstance(result, dict) and "csrf_token" in result:
                self.csrf = result["csrf_token"]
            return start["status"], result, response_headers, raw_headers
        return asyncio.run(run())

    def login(self, email="member@example.org"):
        assert self.call("GET", "/auth/csrf")[0] == 200
        result = self.call("POST", "/auth/login", {"email": email, "password": PASSWORD})
        assert result[0] == 200
        return result


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(settings, "secret_key", secrets.token_urlsafe(48))
    monkeypatch.setattr(settings, "cors_origins", ORIGIN)
    engine = create_engine(f"sqlite:///{tmp_path / 'security.sqlite'}", connect_args={"check_same_thread": False})
    factory = sessionmaker(engine, autoflush=False)
    Base.metadata.create_all(engine)
    with factory() as db:
        digest = hash_password(PASSWORD)
        db.add_all([User(email="member@example.org", password_hash=digest, role="user"),
                    User(email="admin@example.org", password_hash=digest, role="admin")])
        db.commit()
    app = create_app()
    fastapi = app.app.app

    def isolated_db():
        with factory() as db:
            yield db
    fastapi.dependency_overrides[get_db] = isolated_db
    yield Client(app), factory, fastapi
    engine.dispose()


def test_cookie_storage_rotation_logout_replay_and_legacy_bearer(env):
    client, factory, _ = env
    _, login, headers, raw_headers = client.login()
    assert "access_token" not in login and headers["cache-control"] == "no-store"
    cookie = next(v for k, v in raw_headers if k == "set-cookie" and settings.session_cookie_name in v)
    assert all(flag in cookie for flag in ["HttpOnly", "SameSite=strict", "Path=/"])
    assert "Domain=" not in cookie
    token = client.cookies[settings.session_cookie_name]
    with factory() as db:
        session = db.scalar(select(UserSession))
        assert session.token_hash != token and session.token_hash == token_hash(token)
        assert token not in repr(session.__dict__)
    assert client.call("GET", "/auth/me")[0] == 200
    assert client.call("GET", "/users")[0] == 403
    client.login()
    assert client.cookies[settings.session_cookie_name] != token
    replay = Client(client.app)
    replay.cookies[settings.session_cookie_name] = token
    assert replay.call("GET", "/auth/me")[0] == 401
    token = client.cookies[settings.session_cookie_name]
    assert client.call("POST", "/auth/logout")[0] == 204
    assert settings.session_cookie_name not in client.cookies
    replay.cookies[settings.session_cookie_name] = token
    assert replay.call("GET", "/auth/me")[0] == 401
    replay.cookies.clear()
    assert replay.call("GET", "/auth/me", headers={"authorization": "Bearer synthetic-legacy-token"})[0] == 401
    client.call("GET", "/auth/csrf")
    assert client.call("POST", "/auth/logout")[0] == 204


@pytest.mark.parametrize("origin,csrf", [(ORIGIN, False), (None, True), ("https://evil.example", True)])
def test_csrf_blocks_login_and_mutations(env, origin, csrf):
    client, factory, _ = env
    client.call("GET", "/auth/csrf")
    assert client.call("POST", "/auth/login", {"email": "member@example.org", "password": PASSWORD}, origin=origin, csrf=csrf)[0] == 403
    client.login()
    assert client.call("POST", "/auth/logout", origin=origin, csrf=csrf)[0] == 403
    assert client.call("POST", "/dossiers/preview", origin=origin, csrf=csrf, raw=b"malformed upload")[0] == 403
    assert client.call("GET", "/auth/me")[0] == 200
    with factory() as db:
        assert db.scalar(select(UserSession)).revoked_at is None


def test_csrf_tamper_expiry_and_session_binding(env):
    client, _, _ = env
    client.call("GET", "/auth/csrf")
    client.csrf += "tampered"
    assert client.call("POST", "/auth/login", {})[0] == 403
    client.cookies[settings.csrf_cookie_name] = "x" * 43 + ".1." + "a" * 64
    client.csrf = client.cookies[settings.csrf_cookie_name]
    assert client.call("POST", "/auth/login", {})[0] == 403
    client.login()
    previous_csrf = client.csrf
    client.login()
    client.csrf = previous_csrf
    assert client.call("POST", "/auth/logout")[0] == 403


@pytest.mark.parametrize("field", ["expires_at", "last_seen_at"])
def test_absolute_and_idle_expiry(env, field):
    client, factory, _ = env
    client.login()
    with factory() as db:
        setattr(db.scalar(select(UserSession)), field, now_utc() - timedelta(days=1))
        db.commit()
    assert client.call("GET", "/auth/me")[0] == 401
    assert client.call("POST", "/auth/logout")[0] == 204


def test_activity_extends_idle_but_not_absolute_deadline(env):
    client, factory, _ = env
    client.login()
    with factory() as db:
        session = db.scalar(select(UserSession))
        absolute, old = session.expires_at, now_utc() - timedelta(minutes=5)
        session.last_seen_at = old
        db.commit()
    response = client.call("GET", "/auth/session")
    assert response[0] == 200 and response[2]["x-session-id"] == response[1]["session_id"]
    with factory() as db:
        session = db.scalar(select(UserSession))
        assert session.expires_at == absolute and session.last_seen_at.replace(tzinfo=old.tzinfo) > old


@pytest.mark.parametrize("change", [{"password": "Replacement-synthetic-password!"}, {"role": "admin"}, {"is_active": False}])
def test_account_changes_revoke_all_sessions(env, change):
    client, factory, _ = env
    client.login()
    other, admin = Client(client.app), Client(client.app)
    other.login()
    admin.login("admin@example.org")
    assert admin.call("PATCH", "/users/1", change)[0] == 200
    assert client.call("GET", "/auth/me")[0] == 401
    assert other.call("GET", "/auth/me")[0] == 401
    if "is_active" in change:
        assert admin.call("PATCH", "/users/1", {"is_active": True})[0] == 200
        assert client.call("GET", "/auth/me")[0] == 401
    assert admin.call("GET", "/users")[0] == 200
    with factory() as db:
        assert all(s.revoked_at for s in db.scalars(select(UserSession).where(UserSession.user_id == 1)))


def test_manual_revocation_logout_all_and_admin_authorization(env):
    client, _, _ = env
    client.login()
    other = Client(client.app)
    other.login()
    assert client.call("POST", "/users/2/revoke-sessions")[0] == 403
    assert client.call("POST", "/auth/logout-all")[0] == 204
    assert other.call("GET", "/auth/me")[0] == 401
    client.login()
    admin = Client(client.app)
    admin.login("admin@example.org")
    assert admin.call("POST", "/users/1/revoke-sessions")[0] == 204
    assert client.call("GET", "/auth/me")[0] == 401
    assert admin.call("GET", "/auth/me")[0] == 200


def test_delete_recreate_and_out_of_band_password_change(env):
    client, factory, _ = env
    client.login()
    with factory() as db:
        db.get(User, 1).password_hash = hash_password(PASSWORD)
        db.commit()
    assert client.call("GET", "/auth/me")[0] == 401
    client.login()
    admin = Client(client.app)
    admin.login("admin@example.org")
    assert admin.call("DELETE", "/users/1")[0] == 200
    with factory() as db:
        assert not list(db.scalars(select(UserSession).where(UserSession.user_id == 1)))
        db.add(User(id=1, email="member@example.org", password_hash=hash_password(PASSWORD), role="user"))
        db.commit()
    assert client.call("GET", "/auth/me")[0] == 401


def test_login_failure_audit_and_validation_do_not_include_secrets(env):
    client, factory, _ = env
    client.call("GET", "/auth/csrf")
    assert client.call("POST", "/auth/login", {"email": "unknown@example.org", "password": PASSWORD})[0] == 401
    invalid = client.call("POST", "/auth/login", {"email": "invalid", "password": {"sensitive": PASSWORD}})
    assert invalid[0] == 422 and PASSWORD not in json.dumps(invalid[1])
    with factory() as db:
        logs = list(db.scalars(select(AuditLog)))
        assert any(log.action == "Aanmelden mislukt" for log in logs)
        assert all(PASSWORD not in log.metadata_json and "unknown@example.org" not in log.actor_email for log in logs)


def test_cors_and_cache_headers(env):
    client, _, _ = env
    allowed = client.call("OPTIONS", "/auth/login", headers={"access-control-request-method": "POST", "access-control-request-headers": "content-type,x-csrf-token"})
    assert allowed[0] == 200 and allowed[2]["access-control-allow-origin"] == ORIGIN
    denied = client.call("OPTIONS", "/auth/login", origin="https://evil.example", headers={"access-control-request-method": "POST"})
    assert denied[0] == 400 and "access-control-allow-origin" not in denied[2]
    for path in ["/auth/csrf", "/auth/me", "/urgencies", "/plannings/1/excel", "/not-found", "/health"]:
        response = client.call("GET", path)
        assert response[2]["cache-control"] == "no-store" and response[2]["x-content-type-options"] == "nosniff"


def production_settings(**overrides):
    defaults = dict(_env_file=None, environment="production", secret_key=secrets.token_urlsafe(48),
                    database_url="postgresql+psycopg://app_runtime:synthetic-unique-password@db/gsc",
                    bootstrap_admin_email="", bootstrap_admin_password="", cors_origins="https://app.globalsmilecare.be")
    return Settings(**(defaults | overrides))


@pytest.mark.parametrize("overrides", [
    {"secret_key": ""}, {"secret_key": "x" * 64}, {"secret_key": "change-this-to-a-long-random-secret"},
    {"database_url": "sqlite://"}, {"database_url": "postgresql://postgres:password@db/gsc"},
    {"database_url": "postgresql://gsc:gsc@db/gsc"}, {"cors_origins": "*"},
    {"cors_origins": "https://*.example.org"}, {"cors_origins": ORIGIN},
    {"bootstrap_admin_password": "synthetic-bootstrap-password"},
    {"cors_origins": "https://example.org/path"}, {"environment": "prod-typo"},
])
def test_production_fails_closed(overrides):
    with pytest.raises(ValidationError):
        production_settings(**overrides)


def test_production_cookie_flags(env, monkeypatch):
    client, _, _ = env
    production = production_settings()
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "cors_origins", production.cors_origins)
    origin = production.cors_origin_list[0]
    challenge = client.call("GET", "/auth/csrf", origin=origin)
    response = client.call("POST", "/auth/login", {"email": "member@example.org", "password": PASSWORD}, origin=origin)
    assert response[0] == 200
    for result in (challenge, response, client.call("POST", "/auth/logout", origin=origin)):
        cookies = [v for k, v in result[3] if k == "set-cookie"]
        assert cookies and all(c.startswith("__Host-") and "Secure" in c and "HttpOnly" in c
                               and "SameSite=strict" in c and "Path=/" in c and "Domain=" not in c for c in cookies)


def test_password_compatibility_and_malformed_hashes():
    digest = hash_password(PASSWORD)
    assert verify_password(PASSWORD, digest) and not verify_password("wrong", digest)
    for malformed in ["", "pbkdf2_sha256$!$?", "pbkdf2_sha256$x$y", "unknown$a$b"]:
        assert not verify_password(PASSWORD, malformed)


@pytest.mark.parametrize("kind", ["Behandeling", "Screening"])
@pytest.mark.parametrize("value", ["=1+1", "+1+1", "-1+1", "@SUM(1,1)", "\t=1+1", "#REF!"])
def test_excel_user_text_is_never_a_formula(kind, value):
    rows = [{planning.PATIENT_DONE_COL: False, planning.PATIENT_NR_COL: 1, planning.PATIENT_COL: value,
             planning.TREATMENTS_COL: value, planning.DATE_PERIOD_COL: value, planning.REMARKS_COL: value}]
    sheet = load_workbook(planning.build_excel_file(value, date(2026, 9, 10), value, rows, kind), data_only=False)["Planning"]
    assert sheet["A1"].value == value and sheet["B4"].value == value
    assert sheet["B8"].value == 1 and sheet["B8"].data_type == "n"
    assert sheet["C8"].value == value and sheet["C8"].data_type == "s"
    assert not any(cell.data_type == "f" for row in sheet for cell in row)
    assert len(sheet.data_validations.dataValidation) == 1 and len(sheet.conditional_formatting) == 1


def route_plan(color):
    return {"generated_at": "2026-09-10T08:00:00Z", "execution_date": "2026-09-10", "provider": "estimate",
            "uses_real_road_network": False, "start_location": {"label": "Start", "latitude": 51, "longitude": 4},
            "return_to_start": True, "routes": [{"route_id": "route-1", "label": "Route", "color": color, "stops": [],
            "total_distance_km": 0, "total_driving_minutes": 0, "total_service_minutes": 0, "total_duration_minutes": 0,
            "estimated_start_time": "08:30", "estimated_end_time": "08:30", "end_location_label": "Start",
            "final_driving_minutes": 0, "final_distance_km": 0}]}


def test_route_color_validation_and_legacy_stored_xss(env):
    client, factory, _ = env
    client.login()
    malicious = '\"><img src=x onerror="syntheticAttack()">'
    payload = {"execution_date": "2026-09-10", "title": "Synthetic route", "plan": route_plan(malicious)}
    assert client.call("POST", "/urgencies/saved-route-plans", payload)[0] == 422
    payload["plan"] = route_plan("#aAbB12")
    assert client.call("POST", "/urgencies/saved-route-plans", payload)[0] == 200
    with factory() as db:
        db.add(SavedUrgencyRoutePlan(execution_date=date(2026, 9, 10), title="Legacy synthetic", plan_json=json.dumps(route_plan(malicious)), created_by="member@example.org"))
        db.commit()
    response = client.call("GET", "/urgencies/saved-route-plans")
    assert response[0] == 200 and malicious not in json.dumps(response[1])
    assert {item["plan"]["routes"][0]["color"] for item in response[1]} == {"#aAbB12", "#2E6F95"}
    with factory() as db:
        assert any(malicious in json.loads(row.plan_json)["routes"][0]["color"] for row in db.scalars(select(SavedUrgencyRoutePlan)))


def test_startup_adds_sessions_without_changing_existing_accounts(env, monkeypatch):
    import app.main as main
    import app.db.migrations as migrations
    from sqlalchemy import inspect

    _, factory, fastapi = env
    engine = factory.kw["bind"]
    with factory() as db:
        before = [(user.id, user.email, user.password_hash, user.role) for user in db.scalars(select(User).order_by(User.id))]
    UserSession.__table__.drop(engine)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", factory)
    monkeypatch.setattr(migrations, "engine", engine)
    monkeypatch.setattr(settings, "bootstrap_admin_email", "")
    monkeypatch.setattr(settings, "bootstrap_admin_password", "")
    for _ in range(2):
        fastapi.router.on_startup[0]()
    assert "user_sessions" in inspect(engine).get_table_names()
    with factory() as db:
        after = [(user.id, user.email, user.password_hash, user.role) for user in db.scalars(select(User).order_by(User.id))]
    assert before == after


def test_error_responses_are_not_cached_and_do_not_reveal_exception(env):
    client, _, fastapi = env

    @fastapi.get("/synthetic-error")
    def fail():
        raise RuntimeError("synthetic-private-exception-detail")

    captured = []
    inner = client.app

    async def capture(scope, receive, send):
        async def record(message):
            captured.append(message)
            await send(message)
        try:
            await inner(scope, receive, record)
        except RuntimeError:
            pass  # ASGI server logs/re-raises after sending the generic 500 response.

    client.app = capture
    response = client.call("GET", "/synthetic-error")
    assert response[0] == 500 and response[2]["cache-control"] == "no-store"
    assert b"synthetic-private-exception-detail" not in response[1]
    assert response[2]["access-control-allow-origin"] == ORIGIN


def test_admin_password_change_rejects_old_password_and_keeps_value_private(env):
    client, factory, _ = env
    client.login()
    replacement = "Another-synthetic-password!"
    assert client.call("PATCH", "/users/1", {"password": replacement})[0] == 403
    assert client.call("PATCH", "/users/2", {"password": replacement})[0] == 403
    admin = Client(client.app)
    admin.login("admin@example.org")
    response = admin.call("PATCH", "/users/1", {"password": replacement})
    assert response[0] == 200 and replacement not in json.dumps(response[1])
    assert client.call("GET", "/auth/me")[0] == 401
    client.call("GET", "/auth/csrf")
    assert client.call("POST", "/auth/login", {"email": "member@example.org", "password": PASSWORD})[0] == 401
    assert client.call("POST", "/auth/login", {"email": "member@example.org", "password": replacement})[0] == 200
    with factory() as db:
        user = db.get(User, 1)
        assert user.password_hash != replacement and verify_password(replacement, user.password_hash)
        assert all(replacement not in log.metadata_json for log in db.scalars(select(AuditLog)))


def test_admin_changing_own_password_must_sign_in_again(env):
    client, _, _ = env
    client.login("admin@example.org")
    assert client.call("PATCH", "/users/2", {"password": "Synthetic-replacement-password!"})[0] == 200
    assert client.call("GET", "/auth/me")[0] == 401
