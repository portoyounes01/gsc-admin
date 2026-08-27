from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import TeamProfile, User
from app.schemas import TeamProfileCreate, TeamProfileOut, TeamProfileUpdate
from app.services.audit import add_audit_log

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamProfileOut])
def list_team_profiles(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[TeamProfile]:
    return list(db.scalars(select(TeamProfile).order_by(TeamProfile.is_active.desc(), TeamProfile.name)))


@router.post("", response_model=TeamProfileOut)
def create_team_profile(
    payload: TeamProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> TeamProfile:
    profile = TeamProfile(**payload.model_dump())
    db.add(profile)
    add_audit_log(db, current_user, "Teams", "Teamprofiel toegevoegd", {"teamlid": payload.name})
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/{profile_id}", response_model=TeamProfileOut)
def update_team_profile(
    profile_id: int,
    payload: TeamProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> TeamProfile:
    profile = db.get(TeamProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Teamprofiel niet gevonden.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    add_audit_log(db, current_user, "Teams", "Teamprofiel bijgewerkt", {"teamlid": profile.name})
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
def delete_team_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    profile = db.get(TeamProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Teamprofiel niet gevonden.")
    name = profile.name
    db.delete(profile)
    add_audit_log(db, current_user, "Teams", "Teamprofiel verwijderd", {"teamlid": name})
    db.commit()
    return {"status": "deleted"}
