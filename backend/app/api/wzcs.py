from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models import Urgency, User, Wzc
from app.schemas import WzcCreate, WzcOut, WzcUpdate
from app.services.audit import add_audit_log
from app.services.geocoding import fill_missing_coordinates

router = APIRouter(prefix="/wzcs", tags=["wzcs"])


def wzc_to_out(wzc: Wzc, open_urgencies: int = 0) -> WzcOut:
    data = WzcOut.model_validate(wzc).model_dump()
    data["open_urgencies"] = open_urgencies
    return WzcOut(**data)


@router.get("", response_model=list[WzcOut])
def list_wzcs(
    search: str = "",
    status: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[WzcOut]:
    statement = select(Wzc)
    if search:
        like = f"%{search.strip()}%"
        statement = statement.where(Wzc.name.ilike(like))
    if status:
        statement = statement.where(Wzc.collaboration_status == status)
    wzcs = list(db.scalars(statement.order_by(Wzc.name)))

    urgency_counts = dict(
        db.execute(
            select(Urgency.wzc_id, func.count(Urgency.id))
            .where(Urgency.status != "Afgerond", Urgency.wzc_id.is_not(None))
            .group_by(Urgency.wzc_id)
        ).all()
    )
    return [wzc_to_out(wzc, int(urgency_counts.get(wzc.id, 0))) for wzc in wzcs]


@router.post("", response_model=WzcOut)
def create_wzc(
    payload: WzcCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> WzcOut:
    external_id = payload.external_id.strip() or f"WZC-{uuid.uuid4().hex[:8].upper()}"
    values = fill_missing_coordinates(db, payload.model_dump(exclude={"external_id"}))
    wzc = Wzc(**values, external_id=external_id)
    db.add(wzc)
    add_audit_log(db, current_user, "WZC database", "WZC toegevoegd", {"wzc": wzc.name})
    db.commit()
    db.refresh(wzc)
    return wzc_to_out(wzc)


@router.patch("/{wzc_id}", response_model=WzcOut)
def update_wzc(
    wzc_id: int,
    payload: WzcUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> WzcOut:
    wzc = db.get(Wzc, wzc_id)
    if not wzc:
        raise HTTPException(status_code=404, detail="WZC niet gevonden.")
    updates = payload.model_dump(exclude_unset=True)
    location_changed = any(key in updates for key in {"address", "postal_code", "city"})
    explicit_coordinates = any(key in updates for key in {"latitude", "longitude"})
    values = WzcOut.model_validate(wzc).model_dump(exclude={"id", "created_at", "updated_at", "open_urgencies"})
    values.update(updates)
    if location_changed and not explicit_coordinates:
        values.update({"latitude": None, "longitude": None, "map_source": "", "address_source": ""})
    values = fill_missing_coordinates(db, values)
    for key, value in values.items():
        setattr(wzc, key, value)
    add_audit_log(db, current_user, "WZC database", "WZC bijgewerkt", {"wzc": wzc.name})
    db.commit()
    db.refresh(wzc)
    return wzc_to_out(wzc)


@router.delete("/{wzc_id}")
def delete_wzc(
    wzc_id: int,
    confirm_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    wzc = db.get(Wzc, wzc_id)
    if not wzc:
        raise HTTPException(status_code=404, detail="WZC niet gevonden.")
    if confirm_name.strip() != wzc.name:
        raise HTTPException(status_code=400, detail="Bevestigingsnaam komt niet overeen.")
    name = wzc.name
    db.delete(wzc)
    add_audit_log(db, current_user, "WZC database", "WZC verwijderd", {"wzc": name})
    db.commit()
    return {"status": "deleted"}
