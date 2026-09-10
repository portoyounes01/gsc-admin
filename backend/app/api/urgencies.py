from __future__ import annotations

import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import SavedUrgencyRoutePlan, Urgency, User, Wzc
from app.schemas import (
    SavedUrgencyRoutePlanCreate,
    SavedUrgencyRoutePlanOut,
    UrgencyCreate,
    UrgencyOut,
    UrgencyRoutePlanOut,
    UrgencyRoutePlanRequest,
    UrgencyUpdate,
)
from app.services.audit import add_audit_log
from app.services.routing import RoutePlanningError, build_urgency_route_plan

router = APIRouter(prefix="/urgencies", tags=["urgencies"])


def saved_route_plan_response(saved_route_plan: SavedUrgencyRoutePlan) -> SavedUrgencyRoutePlanOut:
    plan_data = json.loads(saved_route_plan.plan_json)
    plan = UrgencyRoutePlanOut.model_validate(plan_data)
    return SavedUrgencyRoutePlanOut(
        id=saved_route_plan.id,
        execution_date=saved_route_plan.execution_date,
        title=saved_route_plan.title,
        created_by=saved_route_plan.created_by,
        created_at=saved_route_plan.created_at,
        updated_at=saved_route_plan.updated_at,
        plan=plan,
    )


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


@router.get("/saved-route-plans", response_model=list[SavedUrgencyRoutePlanOut])
def list_saved_route_plans(
    execution_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SavedUrgencyRoutePlanOut]:
    statement = select(SavedUrgencyRoutePlan)
    if execution_date:
        statement = statement.where(SavedUrgencyRoutePlan.execution_date == execution_date)
    saved_route_plans = db.scalars(statement.order_by(SavedUrgencyRoutePlan.execution_date.desc(), SavedUrgencyRoutePlan.created_at.desc()))
    return [saved_route_plan_response(saved_route_plan) for saved_route_plan in saved_route_plans]


@router.post("/saved-route-plans", response_model=SavedUrgencyRoutePlanOut)
def save_route_plan(
    payload: SavedUrgencyRoutePlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavedUrgencyRoutePlanOut:
    plan_data = payload.plan.model_dump(mode="json")
    plan_data["execution_date"] = payload.execution_date.isoformat()
    assigned_count = sum(len(route.stops) for route in payload.plan.routes)
    title = payload.title.strip() or f"Urgentieroute {payload.execution_date.strftime('%d-%m-%Y')} ({assigned_count} urgenties)"
    saved_route_plan = SavedUrgencyRoutePlan(
        execution_date=payload.execution_date,
        title=title,
        plan_json=json.dumps(plan_data, ensure_ascii=False),
        created_by=current_user.email,
    )
    db.add(saved_route_plan)
    add_audit_log(
        db,
        current_user,
        "Urgenties",
        "Routeplanning opgeslagen",
        {
            "execution_date": payload.execution_date.isoformat(),
            "assigned_count": assigned_count,
            "route_count": len(payload.plan.routes),
            "provider": payload.plan.provider,
        },
    )
    db.commit()
    db.refresh(saved_route_plan)
    return saved_route_plan_response(saved_route_plan)


@router.delete("/saved-route-plans/{route_plan_id}")
def delete_saved_route_plan(
    route_plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    saved_route_plan = db.get(SavedUrgencyRoutePlan, route_plan_id)
    if not saved_route_plan:
        raise HTTPException(status_code=404, detail="Opgeslagen routeplan niet gevonden.")
    db.delete(saved_route_plan)
    add_audit_log(
        db,
        current_user,
        "Urgenties",
        "Opgeslagen routeplanning verwijderd",
        {"route_plan_id": route_plan_id},
    )
    db.commit()
    return {"status": "deleted"}


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
