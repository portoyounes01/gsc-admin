from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_portal_account, require_admin
from app.core.config import settings
from app.core.ratelimit import register_failure, register_success, retry_after_seconds
from app.core.security import create_portal_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Planning, PortalAccount, Urgency, User, Wzc
from app.services.audit import add_audit_log
from app.schemas import (
    LoginIn,
    PortalAccountCreate,
    PortalAccountOut,
    PortalAccountUpdate,
    PortalAppointmentOut,
    PortalDemoCentreOut,
    PortalMeOut,
    PortalServiceOut,
    PortalUrgencyCreate,
    PortalUrgencyOut,
    TokenOut,
)

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/demo-centres", response_model=list[PortalDemoCentreOut])
def list_demo_centres(db: Session = Depends(get_db)) -> list[PortalDemoCentreOut]:
    if settings.environment != "local":
        raise HTTPException(status_code=404, detail="Niet gevonden.")
    rows = db.execute(
        select(Wzc.name, Wzc.city, PortalAccount.email)
        .join(PortalAccount, PortalAccount.wzc_id == Wzc.id)
        .where(Wzc.external_id.like("portal-demo-%"), PortalAccount.is_active.is_(True))
        .order_by(Wzc.external_id)
    ).all()
    return [PortalDemoCentreOut(name=name, city=city, email=email) for name, city, email in rows]


def urgency_scope_statement(wzc_id: int):
    return select(Urgency).where(Urgency.wzc_id == wzc_id)


def planning_scope_statement(wzc_id: int):
    return select(Planning).where(Planning.wzc_id == wzc_id)


@router.post("/auth/login", response_model=TokenOut)
def portal_login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    email = payload.email.strip().lower()
    throttle_key = f"portal:{request.client.host if request.client else '?'}:{email}"
    wait = retry_after_seconds(throttle_key)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Te veel mislukte aanmeldpogingen. Probeer later opnieuw.",
            headers={"Retry-After": str(wait)},
        )
    account = db.scalar(select(PortalAccount).where(PortalAccount.email == email, PortalAccount.is_active.is_(True)))
    if not account or not verify_password(payload.password, account.password_hash):
        register_failure(throttle_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ongeldige portal-login.")
    register_success(throttle_key)
    return TokenOut(access_token=create_portal_access_token(account.email, account.role))


@router.get("/accounts", response_model=list[PortalAccountOut])
def list_portal_accounts(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[PortalAccount]:
    accounts = db.scalars(select(PortalAccount).order_by(PortalAccount.id)).all()
    return [PortalAccountOut.model_validate({**a.__dict__, "wzc_name": a.wzc.name}) for a in accounts]


@router.post("/accounts", response_model=PortalAccountOut)
def create_portal_account(
    payload: PortalAccountCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PortalAccount:
    email = payload.email.strip().lower()
    if db.scalar(select(PortalAccount).where(PortalAccount.email == email)):
        raise HTTPException(status_code=409, detail="Dit portal-e-mailadres bestaat al.")
    if not db.get(Wzc, payload.wzc_id):
        raise HTTPException(status_code=404, detail="WZC niet gevonden.")
    account = PortalAccount(email=email, wzc_id=payload.wzc_id, password_hash=hash_password(payload.password), role=payload.role)
    db.add(account)
    db.commit()
    db.refresh(account)
    return PortalAccountOut.model_validate({**account.__dict__, "wzc_name": account.wzc.name})


@router.patch("/accounts/{account_id}", response_model=PortalAccountOut)
def update_portal_account(
    account_id: int,
    payload: PortalAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> PortalAccountOut:
    account = db.get(PortalAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal-account niet gevonden.")
    changes: dict[str, object] = {}
    if payload.email is not None:
        email = payload.email.strip().lower()
        if email != account.email:
            if db.scalar(select(PortalAccount).where(PortalAccount.email == email)):
                raise HTTPException(status_code=409, detail="Dit portal-e-mailadres bestaat al.")
            changes["email"] = f"{account.email} -> {email}"
            account.email = email
    if payload.password is not None:
        account.password_hash = hash_password(payload.password)
        changes["password"] = True
    if payload.role is not None:
        if payload.role not in {"staff", "admin"}:
            raise HTTPException(status_code=422, detail="Ongeldige rol.")
        account.role = payload.role
        changes["role"] = payload.role
    if payload.is_active is not None:
        account.is_active = payload.is_active
        changes["is_active"] = payload.is_active
    add_audit_log(db, current_user, "Portaal", "Portal-account bijgewerkt", {"account_id": account.id, **changes})
    db.commit()
    db.refresh(account)
    return PortalAccountOut.model_validate({**account.__dict__, "wzc_name": account.wzc.name})


@router.delete("/accounts/{account_id}")
def delete_portal_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict[str, str]:
    account = db.get(PortalAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Portal-account niet gevonden.")
    add_audit_log(db, current_user, "Portaal", "Portal-account verwijderd", {"account_id": account.id, "wzc_id": account.wzc_id})
    db.delete(account)
    db.commit()
    return {"status": "deleted"}


@router.get("/me", response_model=PortalMeOut)
def portal_me(account: PortalAccount = Depends(get_current_portal_account)) -> PortalMeOut:
    return PortalMeOut.model_validate({**account.__dict__, "wzc_name": account.wzc.name})


@router.get("/appointments", response_model=list[PortalAppointmentOut])
def portal_appointments(
    db: Session = Depends(get_db),
    account: PortalAccount = Depends(get_current_portal_account),
) -> list[PortalAppointmentOut]:
    plannings = db.scalars(planning_scope_statement(account.wzc_id).order_by(Planning.planning_date.asc(), Planning.start_time.asc())).all()
    return [PortalAppointmentOut(id=item.id, date=item.planning_date, start_time=item.start_time, end_time=item.end_time, type=item.planning_type, status=item.planning_status, note=item.note) for item in plannings]


@router.get("/services", response_model=list[PortalServiceOut])
def portal_services(
    db: Session = Depends(get_db),
    account: PortalAccount = Depends(get_current_portal_account),
) -> list[PortalServiceOut]:
    plannings = db.scalars(planning_scope_statement(account.wzc_id).order_by(Planning.planning_date.desc())).all()
    return [PortalServiceOut(id=item.id, date=item.planning_date, type=item.planning_type, status=item.planning_status, summary=item.team_label or item.name) for item in plannings]


@router.get("/urgencies", response_model=list[PortalUrgencyOut])
def portal_urgencies(
    db: Session = Depends(get_db),
    account: PortalAccount = Depends(get_current_portal_account),
) -> list[Urgency]:
    return list(db.scalars(urgency_scope_statement(account.wzc_id).order_by(Urgency.reported_on.desc(), Urgency.created_at.desc())))


@router.post("/urgencies", response_model=PortalUrgencyOut)
def create_portal_urgency(
    payload: PortalUrgencyCreate,
    db: Session = Depends(get_db),
    account: PortalAccount = Depends(get_current_portal_account),
) -> Urgency:
    urgency = Urgency(
        reported_on=payload.reported_on,
        wzc_id=account.wzc_id,
        wzc_name=account.wzc.name,
        patient_name=payload.patient_name,
        urgency_type=payload.urgency_type,
        remark=payload.remark,
    )
    db.add(urgency)
    db.commit()
    db.refresh(urgency)
    return urgency


@router.get("/urgencies/{urgency_id}", response_model=PortalUrgencyOut)
def portal_urgency_detail(
    urgency_id: int,
    db: Session = Depends(get_db),
    account: PortalAccount = Depends(get_current_portal_account),
) -> Urgency:
    urgency = db.scalar(urgency_scope_statement(account.wzc_id).where(Urgency.id == urgency_id))
    if not urgency:
        raise HTTPException(status_code=404, detail="Urgentie niet gevonden.")
    return urgency
