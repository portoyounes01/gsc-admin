from __future__ import annotations

import hmac
from datetime import timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.sessions import account_fingerprint, now_utc, session_deadline, token_hash
from app.db.session import get_db
from app.models import User, UserSession


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(settings.session_cookie_name, "")
    if len(token) != 43:
        raise HTTPException(status_code=401, detail="Niet aangemeld.")
    result = db.execute(select(UserSession, User).join(User, User.id == UserSession.user_id)
                        .where(UserSession.token_hash == token_hash(token),
                               UserSession.revoked_at.is_(None), User.is_active.is_(True))).first()
    now = now_utc()
    if not result:
        raise HTTPException(status_code=401, detail="Sessie ongeldig of verlopen.")
    session, user = result
    if session_deadline(session) <= now or not hmac.compare_digest(session.account_fingerprint, account_fingerprint(user)):
        raise HTTPException(status_code=401, detail="Sessie ongeldig of verlopen.")
    # Conditional update cannot resurrect a concurrently revoked/expired session.
    updated = db.execute(update(UserSession).where(
        UserSession.id == session.id, UserSession.revoked_at.is_(None),
        UserSession.expires_at > now,
        UserSession.last_seen_at > now - timedelta(minutes=settings.session_idle_minutes),
    ).values(last_seen_at=now).execution_options(synchronize_session=False))
    if updated.rowcount != 1:
        raise HTTPException(status_code=401, detail="Sessie ongeldig of verlopen.")
    db.commit()
    request.state.auth_session = session
    request.state.auth_session_headers = (session.id, session_deadline(session).isoformat())
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Adminrechten vereist.")
    return current_user
