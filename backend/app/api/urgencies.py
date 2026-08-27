from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Urgency, User, Wzc
from app.schemas import UrgencyCreate, UrgencyOut, UrgencyRoutePlanOut, UrgencyRoutePlanRequest, UrgencyUpdate
from app.services.audit import add_audit_log
from app.services.routing import RoutePlanningError, build_urgency_route_plan

router = APIRouter(prefix="/urgencies", tags=["urgencies"])


@router.get("", response_model=list[UrgencyOut])
def list_urgencies(
    status: str = "",
    wzc_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Urgency]:
    statement = select(Urgency)
    if status:
        statement = statement.where(Urgency.status == status)
    if wzc_id:
        statement = statement.where(Urgency.wzc_id == wzc_id)
    return list(db.scalars(statement.order_by(Urgency.reported_on.desc(), Urgency.created_at.desc())))


@router.post("", response_model=UrgencyOut)
def create_urgency(
    payload: UrgencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Urgency:
    wzc_name = payload.wzc_name
    if payload.wzc_id:
        wzc = db.get(Wzc, payload.wzc_id)
        if not wzc:
            raise HTTPException(status_code=404, detail="WZC niet gevonden.")
        wzc_name = wzc.name
    urgency = Urgency(**payload.model_dump(exclude={"wzc_name"}), wzc_name=wzc_name)
    db.add(urgency)
    add_audit_log(
        db,
        current_user,
        "Urgenties",
        "Urgentie toegevoegd",
        {"wzc": wzc_name, "patient_name": "niet gelogd", "type": payload.urgency_type},
    )
    db.commit()
    db.refresh(urgency)
    return urgency


@router.post("/route-plan", response_model=UrgencyRoutePlanOut)
def plan_urgency_routes(
    payload: UrgencyRoutePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UrgencyRoutePlanOut:
    selected_ids = list(dict.fromkeys(payload.urgency_ids))
    statement = (
        select(Urgency)
        .options(joinedload(Urgency.wzc))
        .where(Urgency.id.in_(selected_ids))
    )
    urgencies = list(db.scalars(statement))
    try:
        route_plan = build_urgency_route_plan(urgencies, payload)
    except RoutePlanningError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    add_audit_log(
        db,
        current_user,
        "Urgenties",
        "Routeplanning berekend",
        {
            "selected_count": len(selected_ids),
            "route_count": payload.route_count,
            "assigned_count": sum(len(route.stops) for route in route_plan.routes),
            "unassigned_count": len(route_plan.unassigned_urgencies),
            "provider": route_plan.provider,
        },
    )
    db.commit()
    return route_plan


@router.patch("/{urgency_id}", response_model=UrgencyOut)
def update_urgency(
    urgency_id: int,
    payload: UrgencyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Urgency:
    urgency = db.get(Urgency, urgency_id)
    if not urgency:
        raise HTTPException(status_code=404, detail="Urgentie niet gevonden.")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("wzc_id"):
        wzc = db.get(Wzc, updates["wzc_id"])
        if not wzc:
            raise HTTPException(status_code=404, detail="WZC niet gevonden.")
        updates["wzc_name"] = wzc.name
    for key, value in updates.items():
        setattr(urgency, key, value)
    if urgency.status == "Afgerond" and not urgency.completed_at:
        urgency.completed_at = datetime.now(timezone.utc)
    if urgency.status != "Afgerond":
        urgency.completed_at = None
    add_audit_log(db, current_user, "Urgenties", "Urgentie bijgewerkt", {"wzc": urgency.wzc_name})
    db.commit()
    db.refresh(urgency)
    return urgency


@router.post("/{urgency_id}/complete", response_model=UrgencyOut)
def complete_urgency(
    urgency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Urgency:
    urgency = db.get(Urgency, urgency_id)
    if not urgency:
        raise HTTPException(status_code=404, detail="Urgentie niet gevonden.")
    urgency.status = "Afgerond"
    urgency.completed_at = datetime.now(timezone.utc)
    add_audit_log(db, current_user, "Urgenties", "Urgentie afgerond", {"wzc": urgency.wzc_name})
    db.commit()
    db.refresh(urgency)
    return urgency
