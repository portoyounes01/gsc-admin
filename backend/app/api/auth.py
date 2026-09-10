from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.sessions import (clear_cookies, csrf_for_request, new_session, revoke_cookie_session,
                               revoke_user_sessions, session_csrf, session_deadline, token_hash)
from app.db.session import get_db
from app.models import User, UserSession
from app.schemas import LoginIn, SessionOut, UserOut
from app.services.audit import add_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])
# Avoid the trivial timing difference between an unknown account and a bad password.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


def ensure_bootstrap_admin(db: Session, email: str, password: str) -> None:
    normalized_email = email.strip().lower()
    if settings.environment == "production" or not normalized_email or not password:
        return
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing:
        return
    db.add(User(email=normalized_email, password_hash=hash_password(password), role="admin", is_active=True))
    db.commit()


def session_response(user: User, session: UserSession, token: str) -> SessionOut:
    return SessionOut(user=UserOut.model_validate(user), csrf_token=session_csrf(token),
                      session_id=session.id, expires_at=session_deadline(session))


@router.get("/csrf")
def csrf(request: Request, response: Response) -> dict[str, str]:
    return {"csrf_token": csrf_for_request(request, response)}


@router.post("/login", response_model=SessionOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> SessionOut:
    email = payload.email.strip().lower()
    # Serializes session issuance with administrator account/session changes on PostgreSQL.
    user = db.scalar(select(User).where(User.email == email).with_for_update())
    correct_password = verify_password(payload.password, user.password_hash if user else _DUMMY_PASSWORD_HASH)
    if not user or not user.is_active or not correct_password:
        add_audit_log(db, None, "Login", "Aanmelden mislukt")
        db.commit()
        raise HTTPException(status_code=401, detail="Ongeldige login.")
    revoke_cookie_session(db, request)
    session, token = new_session(db, user, response)
    add_audit_log(db, user, "Login", "Aangemeld")
    db.commit()
    return session_response(user, session, token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/session", response_model=SessionOut)
def current_session(request: Request, current_user: User = Depends(get_current_user)) -> SessionOut:
    return session_response(current_user, request.state.auth_session, request.cookies[settings.session_cookie_name])


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    # Idempotent, including expired sessions. CSRF still applies to this endpoint.
    token = request.cookies.get(settings.session_cookie_name, "")
    user = db.scalar(select(User).join(UserSession, User.id == UserSession.user_id)
                     .where(UserSession.token_hash == token_hash(token), UserSession.revoked_at.is_(None)))
    revoke_cookie_session(db, request)
    if user:
        add_audit_log(db, user, "Login", "Afgemeld")
    db.commit()
    clear_cookies(response)


@router.post("/logout-all", status_code=204)
def logout_all(response: Response, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)) -> None:
    db.scalar(select(User).where(User.id == current_user.id).with_for_update())
    revoke_user_sessions(db, current_user.id)
    add_audit_log(db, current_user, "Login", "Alle sessies ingetrokken")
    db.commit()
    clear_cookies(response)
