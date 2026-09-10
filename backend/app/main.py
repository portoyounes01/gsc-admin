from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import delete
from fastapi.middleware.cors import CORSMiddleware

from app.api import audit_logs, auth, dossiers, plannings, prospects, teams, urgencies, users, wzcs
from app.core.config import settings
from app.core.http_security import BrowserSecurityMiddleware
from app.core.sessions import now_utc
from app.models import UserSession
from app.db.migrations import ensure_lightweight_schema
from app.db.session import Base, SessionLocal, engine
from app.services.audit import purge_old_audit_logs
from app.services.geocoding import check_outbound_https


def create_app():
    api = FastAPI(title=settings.app_name, debug=False)
    api.include_router(auth.router)
    api.include_router(users.router)
    api.include_router(teams.router)
    api.include_router(wzcs.router)
    api.include_router(prospects.router)
    api.include_router(urgencies.router)
    api.include_router(plannings.router)
    api.include_router(audit_logs.router)
    api.include_router(dossiers.router)

    @api.on_event("startup")
    def startup() -> None:
        Base.metadata.create_all(bind=engine)
        ensure_lightweight_schema()
        with SessionLocal() as db:
            auth.ensure_bootstrap_admin(
                db,
                settings.bootstrap_admin_email,
                settings.bootstrap_admin_password,
            )
            db.execute(delete(UserSession).where(UserSession.expires_at < now_utc()))
            purge_old_audit_logs(db)
            db.commit()

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @api.get("/health/geocoding")
    def geocoding_health() -> dict[str, object]:
        return check_outbound_https()

    @api.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # Pydantic error input/context can include passwords, uploaded data or secrets.
        return JSONResponse(status_code=422, content={"detail": "Ongeldige invoer.", "errors": [
            {"loc": error["loc"], "type": error["type"]} for error in exc.errors()
        ]})

    # Wrap the complete application, including its 500 handler and CSRF failures.
    secured = BrowserSecurityMiddleware(api)
    return CORSMiddleware(secured, allow_origins=settings.cors_origin_list,
                          allow_credentials=True,
                          allow_methods=["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
                          allow_headers=["Content-Type", "X-CSRF-Token"],
                          expose_headers=["X-Session-Id", "X-Session-Expires-At"])



app = create_app()
