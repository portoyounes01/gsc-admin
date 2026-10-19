from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import PortalAccount, User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Niet aangemeld.")
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("account_type") == "portal":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessie ongeldig of verlopen.")
    email = str(payload.get("sub") or "").strip().lower()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Gebruiker niet actief.")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Adminrechten vereist.")
    return current_user


def get_current_portal_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> PortalAccount:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Niet aangemeld.")
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("account_type") != "portal":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portalsessie ongeldig of verlopen.")
    email = str(payload.get("sub") or "").strip().lower()
    account = db.scalar(select(PortalAccount).where(PortalAccount.email == email, PortalAccount.is_active.is_(True)))
    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portalaccount niet actief.")
    return account

