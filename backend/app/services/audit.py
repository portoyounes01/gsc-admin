from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import AuditLog, User

SENSITIVE_KEYS = {"password", "patient_name", "insz", "medication", "email_body", "pdf_text"}


def scrub_metadata(metadata: dict[str, object] | None) -> str:
    cleaned = {}
    for key, value in (metadata or {}).items():
        if key.lower() in SENSITIVE_KEYS:
            cleaned[key] = "niet gelogd"
        else:
            cleaned[key] = value
    return json.dumps(cleaned, ensure_ascii=False, default=str)


def add_audit_log(
    db: Session,
    user: User | None,
    module: str,
    action: str,
    metadata: dict[str, object] | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_email=user.email if user else "system",
            module=module,
            action=action,
            metadata_json=scrub_metadata(metadata),
        )
    )


def purge_old_audit_logs(db: Session, retention_days: int = 14) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff))

