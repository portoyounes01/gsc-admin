from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ratelimit import register_failure, register_success, retry_after_seconds
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas import LoginIn, TokenOut, UserOut
from app.services.audit import add_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])


def ensure_bootstrap_admin(db: Session, email: str, password: str) -> None:
    normalized_email = email.strip().lower()
    if not normalized_email or not password:
        return
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing:
        return
    db.add(
        User(
            email=normalized_email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )
    )
    db.commit()


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    email = payload.email.strip().lower()
    throttle_key = f"admin:{request.client.host if request.client else '?'}:{email}"
    wait = retry_after_seconds(throttle_key)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Te veel mislukte aanmeldpogingen. Probeer later opnieuw.",
            headers={"Retry-After": str(wait)},
        )
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if not user or not verify_password(payload.password, user.password_hash):
        register_failure(throttle_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ongeldige login.")
    register_success(throttle_key)
    add_audit_log(db, user, "Login", "Aangemeld")
    db.commit()
    return TokenOut(access_token=create_access_token(user.email, user.role))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

