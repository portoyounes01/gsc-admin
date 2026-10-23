from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import audit_logs, auth, dossiers, plannings, portal, prospects, teams, urgencies, users, wzcs
from app.core.config import settings
from app.db.migrations import ensure_lightweight_schema
from app.db.session import Base, SessionLocal, engine
from app.services.audit import purge_old_audit_logs
from app.services.geocoding import check_outbound_https


def create_app() -> FastAPI:
    expose_docs = settings.environment.strip().lower() == "local"
    api = FastAPI(
        title=settings.app_name,
        docs_url="/docs" if expose_docs else None,
        redoc_url="/redoc" if expose_docs else None,
        openapi_url="/openapi.json" if expose_docs else None,
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    api.include_router(auth.router)
    api.include_router(users.router)
    api.include_router(teams.router)
    api.include_router(wzcs.router)
    api.include_router(prospects.router)
    api.include_router(urgencies.router)
    api.include_router(plannings.router)
    api.include_router(audit_logs.router)
    api.include_router(dossiers.router)
    api.include_router(portal.router)

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
            purge_old_audit_logs(db)
            db.commit()

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @api.get("/health/geocoding")
    def geocoding_health() -> dict[str, object]:
        return check_outbound_https()

    return api


app = create_app()
