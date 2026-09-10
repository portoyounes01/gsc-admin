from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password
from app.core.sessions import revoke_user_sessions
from app.db.session import get_db
from app.models import User, UserSession
from app.schemas import UserCreate, UserOut, UserUpdate
from app.services.audit import add_audit_log

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.email)))


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Gebruiker bestaat al.")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    add_audit_log(db, current_user, "Admin", "Gebruiker toegevoegd", {"email": email, "role": payload.role})
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "password" in updates and updates["password"]:
        user.password_hash = hash_password(str(updates.pop("password")))
    if updates or payload.password:
        revoke_user_sessions(db, user.id)
    for key, value in updates.items():
        setattr(user, key, value)
    add_audit_log(db, current_user, "Admin", "Gebruiker bijgewerkt", {"email": user.email})
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Je kan jezelf niet verwijderen.")
    email = user.email
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.delete(user)
    add_audit_log(db, current_user, "Admin", "Gebruiker verwijderd", {"email": email})
    db.commit()
    return {"status": "deleted"}



@router.post("/{user_id}/revoke-sessions", status_code=204)
def revoke_sessions(user_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)) -> None:
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    revoke_user_sessions(db, user.id)
    add_audit_log(db, current_user, "Admin", "Gebruikerssessies ingetrokken", {"user_id": user.id})
    db.commit()
