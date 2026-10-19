from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models import Prospect, User, Wzc
from app.schemas import ProspectCreate, ProspectOut, ProspectUpdate, WzcOut
from app.services.audit import add_audit_log
from app.services.geocoding import fill_missing_coordinates

router = APIRouter(prefix="/prospects", tags=["prospects"])


def wzc_to_out(wzc: Wzc) -> WzcOut:
    data = WzcOut.model_validate(wzc).model_dump()
    data["open_urgencies"] = 0
    return WzcOut(**data)


@router.get("", response_model=list[ProspectOut])
def list_prospects(
    search: str = "",
    status: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Prospect]:
    statement = select(Prospect)
    if search:
        statement = statement.where(Prospect.name.ilike(f"%{search.strip()}%"))
    if status:
        statement = statement.where(Prospect.status == status)
    return list(db.scalars(statement.order_by(Prospect.name)))


@router.post("", response_model=ProspectOut)
def create_prospect(
    payload: ProspectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Prospect:
    external_id = payload.external_id.strip() or f"PROS-{uuid.uuid4().hex[:8].upper()}"
    values = fill_missing_coordinates(db, payload.model_dump(exclude={"external_id"}))
    prospect = Prospect(**values, external_id=external_id)
    db.add(prospect)
    add_audit_log(db, current_user, "WZC opvolging", "Prospectie toegevoegd", {"prospect": prospect.name})
    db.commit()
    db.refresh(prospect)
    return prospect


@router.patch("/{prospect_id}", response_model=ProspectOut)
def update_prospect(
    prospect_id: int,
    payload: ProspectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Prospect:
    prospect = db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospectie niet gevonden.")
    updates = payload.model_dump(exclude_unset=True)
    location_changed = any(key in updates for key in {"address", "postal_code", "city"})
    explicit_coordinates = any(key in updates for key in {"latitude", "longitude"})
    values = ProspectOut.model_validate(prospect).model_dump(exclude={"id", "created_at", "updated_at"})
    values.update(updates)
    if location_changed and not explicit_coordinates:
        values.update({"latitude": None, "longitude": None, "map_source": "", "address_source": ""})
    values = fill_missing_coordinates(db, values)
    for key, value in values.items():
        setattr(prospect, key, value)
    add_audit_log(db, current_user, "WZC opvolging", "Prospectie bijgewerkt", {"prospect": prospect.name})
    db.commit()
    db.refresh(prospect)
    return prospect


@router.post("/{prospect_id}/convert-to-wzc", response_model=WzcOut)
def convert_prospect_to_wzc(
    prospect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> WzcOut:
    prospect = db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospectie niet gevonden.")
    if not prospect.name.strip():
        raise HTTPException(status_code=400, detail="WZC naam is verplicht om een prospect actief te maken.")

    duplicate = db.scalar(
        select(Wzc).where(
            Wzc.name == prospect.name,
            Wzc.address == prospect.address,
            Wzc.city == prospect.city,
            Wzc.collaboration_status == "Actief",
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Er bestaat al een actieve WZC met dezelfde naam en locatie.")

    prospect_notes = [
        f"Status prospectie: {prospect.status}" if prospect.status else "",
        f"Response: {prospect.response}" if prospect.response else "",
        f"Volgende actie: {prospect.next_action}" if prospect.next_action else "",
    ]
    conversion_note = "Omgezet uit prospectie."
    prospect_summary = " · ".join(note for note in prospect_notes if note)
    remark = "\n".join(part for part in [prospect.remark.strip(), conversion_note, prospect_summary] if part)

    values = {
        "name": prospect.name,
        "group_name": prospect.group_name,
        "address": prospect.address,
        "postal_code": prospect.postal_code,
        "city": prospect.city,
        "contact_name": prospect.contact_name,
        "contact_role": prospect.contact_role,
        "email": prospect.email,
        "phone": prospect.phone,
        "extra_contacts": "",
        "website": prospect.website,
        "collaboration_status": "Actief",
        "last_visit": None,
        "next_visit": None,
        "owner": prospect.owner,
        "remark": remark,
        "resident_count": None,
        "latitude": prospect.latitude,
        "longitude": prospect.longitude,
        "map_source": prospect.map_source,
        "address_source": prospect.address_source,
    }
    values = fill_missing_coordinates(db, values)
    wzc = Wzc(**values, external_id=f"WZC-{uuid.uuid4().hex[:8].upper()}")
    db.add(wzc)
    db.flush()

    name = prospect.name
    db.delete(prospect)
    add_audit_log(db, current_user, "WZC opvolging", "Prospectie omgezet naar actieve WZC", {"prospect": name, "wzc_id": wzc.external_id})
    db.commit()
    db.refresh(wzc)
    return wzc_to_out(wzc)


@router.delete("/{prospect_id}")
def delete_prospect(
    prospect_id: int,
    confirm_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    prospect = db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospectie niet gevonden.")
    if confirm_name.strip() != prospect.name:
        raise HTTPException(status_code=400, detail="Bevestigingsnaam komt niet overeen.")
    name = prospect.name
    db.delete(prospect)
    add_audit_log(db, current_user, "WZC opvolging", "Prospectie verwijderd", {"prospect": name})
    db.commit()
    return {"status": "deleted"}
