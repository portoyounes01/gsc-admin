from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User, UserSession


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime) -> datetime:
    # SQLite returns naive datetimes; PostgreSQL preserves the timezone.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def keyed_digest(purpose: str, value: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"{purpose}:{value}".encode(), hashlib.sha256).hexdigest()


def token_hash(token: str) -> str:
    return keyed_digest("session", token)


def account_fingerprint(user: User) -> str:
    # Also invalidates sessions if an account changes outside the users API.
    # Creation time prevents an old session attaching to a reused SQLite user ID.
    value = f"{user.id}:{aware(user.created_at).isoformat()}:{user.password_hash}:{user.role}:{user.is_active}"
    return keyed_digest("account", value)


def session_csrf(token: str) -> str:
    return keyed_digest("csrf-session", token)


def valid_challenge(token: str) -> bool:
    try:
        nonce, expires, signature = token.split(".")
        return (len(nonce) == 43 and signature.isascii() and now_utc().timestamp() < int(expires)
                and hmac.compare_digest(signature, keyed_digest("csrf-login", f"{nonce}.{expires}")))
    except (ValueError, TypeError):
        return False


def csrf_for_request(request: Request, response: Response) -> str:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        return session_csrf(token)
    challenge = request.cookies.get(settings.csrf_cookie_name, "")
    if not valid_challenge(challenge):
        value = f"{secrets.token_urlsafe(32)}.{int((now_utc() + timedelta(minutes=10)).timestamp())}"
        challenge = f"{value}.{keyed_digest('csrf-login', value)}"
        set_cookie(response, settings.csrf_cookie_name, challenge, max_age=600)
    return challenge


def csrf_is_valid(request: Request) -> bool:
    supplied = request.headers.get("x-csrf-token", "")
    if not supplied or not supplied.isascii() or len(supplied) > 256:
        return False
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        return hmac.compare_digest(supplied, session_csrf(token))
    challenge = request.cookies.get(settings.csrf_cookie_name, "")
    return valid_challenge(challenge) and hmac.compare_digest(supplied, challenge)


def set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(name, value, max_age=max_age, path="/", httponly=True,
                        secure=settings.cookie_secure, samesite="strict")


def clear_cookies(response: Response) -> None:
    for name in (settings.session_cookie_name, settings.csrf_cookie_name):
        response.delete_cookie(name, path="/", httponly=True,
                               secure=settings.cookie_secure, samesite="strict")


def new_session(db: Session, user: User, response: Response) -> tuple[UserSession, str]:
    token = secrets.token_urlsafe(32)
    now = now_utc()
    session = UserSession(token_hash=token_hash(token), user_id=user.id,
                          account_fingerprint=account_fingerprint(user),
                          created_at=now, last_seen_at=now,
                          expires_at=now + timedelta(minutes=settings.session_absolute_minutes))
    db.add(session)
    db.flush()
    set_cookie(response, settings.session_cookie_name, token, settings.session_absolute_minutes * 60)
    response.delete_cookie(settings.csrf_cookie_name, path="/", httponly=True,
                           secure=settings.cookie_secure, samesite="strict")
    return session, token


def revoke_user_sessions(db: Session, user_id: int) -> None:
    db.execute(update(UserSession).where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
               .values(revoked_at=now_utc()))


def revoke_cookie_session(db: Session, request: Request) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        db.execute(update(UserSession).where(UserSession.token_hash == token_hash(token), UserSession.revoked_at.is_(None))
                   .values(revoked_at=now_utc()))


def session_deadline(session: UserSession) -> datetime:
    return min(aware(session.expires_at), aware(session.last_seen_at) + timedelta(minutes=settings.session_idle_minutes))
