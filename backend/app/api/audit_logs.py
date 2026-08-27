from __future__ import annotations

from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogOut
from app.services.audit import add_audit_log

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    actor: str = "",
    module: str = "",
    from_date: date | None = None,
    to_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AuditLog]:
    statement = select(AuditLog)
    if actor:
        statement = statement.where(AuditLog.actor_email.ilike(f"%{actor.strip()}%"))
    if module:
        statement = statement.where(AuditLog.module == module)
    if from_date:
        statement = statement.where(AuditLog.created_at >= datetime.combine(from_date, time.min, tzinfo=timezone.utc))
    if to_date:
        statement = statement.where(AuditLog.created_at <= datetime.combine(to_date, time.max, tzinfo=timezone.utc))
    return list(db.scalars(statement.order_by(AuditLog.created_at.desc()).limit(1000)))


@router.delete("")
def clear_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    db.execute(delete(AuditLog))
    add_audit_log(db, current_user, "Admin", "User log leeggemaakt")
    db.commit()
    return {"status": "cleared"}

