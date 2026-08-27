from __future__ import annotations

import re
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Planning, PlanningRow, User, Wzc
from app.schemas import PlanningCreate, PlanningOut, PlanningRowCreate, PlanningUpdate
from app.services import planning as planning_service
from app.services.audit import add_audit_log

router = APIRouter(prefix="/plannings", tags=["plannings"])


def preview_row_to_schema(row: dict[str, object]) -> PlanningRowCreate:
    return PlanningRowCreate(
        patient_number=int(row.get(planning_service.PATIENT_NR_COL, 0) or 0),
        patient_name=str(row.get(planning_service.PATIENT_COL, "") or ""),
        treatments=str(row.get(planning_service.TREATMENTS_COL, "") or ""),
        date_or_period=str(row.get(planning_service.DATE_PERIOD_COL, "") or ""),
        remarks=str(row.get(planning_service.REMARKS_COL, "") or ""),
        patient_done=bool(row.get(planning_service.PATIENT_DONE_COL, False)),
    )


def planning_rows_for_excel(planning: Planning) -> list[dict[str, object]]:
    return [
        {
            planning_service.PATIENT_DONE_COL: planning_service.CHECKBOX_DONE if row.patient_done else "",
            planning_service.PATIENT_NR_COL: row.patient_number,
            planning_service.PATIENT_COL: row.patient_name,
            planning_service.TREATMENTS_COL: row.treatments,
            planning_service.DATE_PERIOD_COL: row.date_or_period,
            planning_service.REMARKS_COL: row.remarks,
        }
        for row in sorted(planning.rows, key=lambda item: item.patient_number)
    ]


@router.post("/preview", response_model=list[PlanningRowCreate])
async def preview_planning_pdfs(
    planning_date: date = Form(...),
    files: list[UploadFile] = File(...),
    _: User = Depends(get_current_user),
) -> list[PlanningRowCreate]:
    file_payloads = []
    for uploaded_file in files:
        if not uploaded_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{uploaded_file.filename} is geen PDF.")
        file_payloads.append((uploaded_file.filename, await uploaded_file.read()))
    rows = planning_service.preview_uploaded_pdfs(file_payloads, planning_date)
    return [preview_row_to_schema(row) for row in rows]


@router.post("/screening-preview", response_model=list[PlanningRowCreate])
async def preview_screening_workbooks(
    planning_date: date = Form(...),
    files: list[UploadFile] = File(...),
    _: User = Depends(get_current_user),
) -> list[PlanningRowCreate]:
    file_payloads = []
    allowed_extensions = (".xlsx", ".xlsm", ".xls", ".csv")
    for uploaded_file in files:
        if not uploaded_file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(status_code=400, detail=f"{uploaded_file.filename} is geen Excel- of CSV-bestand.")
        file_payloads.append((uploaded_file.filename, await uploaded_file.read()))
    try:
        rows = planning_service.preview_screening_workbooks(file_payloads, planning_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return [preview_row_to_schema(row) for row in rows]


@router.get("", response_model=list[PlanningOut])
def list_plannings(
    upcoming_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Planning]:
    statement = select(Planning).options(selectinload(Planning.rows))
    if upcoming_only:
        statement = statement.where(Planning.planning_date >= date.today())
    return list(db.scalars(statement.order_by(Planning.planning_date.desc(), Planning.name)))


@router.get("/{planning_id}", response_model=PlanningOut)
def get_planning(
    planning_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Planning:
    planning = db.scalar(
        select(Planning)
        .where(Planning.id == planning_id)
        .options(selectinload(Planning.rows))
    )
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    return planning


@router.post("", response_model=PlanningOut)
def create_planning(
    payload: PlanningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Planning:
    wzc = db.get(Wzc, payload.wzc_id) if payload.wzc_id else None
    if payload.wzc_id and not wzc:
        raise HTTPException(status_code=404, detail="WZC niet gevonden.")
    planning = Planning(
        name=payload.name,
        planning_type=payload.planning_type,
        planning_date=payload.planning_date,
        location=wzc.name if wzc else payload.location,
        wzc_id=payload.wzc_id,
        created_by=current_user.email,
    )
    planning.rows = [
        PlanningRow(
            patient_number=row.patient_number,
            patient_name=row.patient_name,
            treatments=row.treatments,
            date_or_period=row.date_or_period,
            remarks=row.remarks,
            patient_done=row.patient_done,
        )
        for row in payload.rows
    ]
    if wzc:
        wzc.next_visit = payload.planning_date
    db.add(planning)
    add_audit_log(
        db,
        current_user,
        "Behandelplanning",
        "Planning aangemaakt",
        {"planning": payload.name, "type": payload.planning_type, "wzc": planning.location, "patienten": len(payload.rows)},
    )
    db.commit()
    db.refresh(planning)
    return get_planning(planning.id, db, current_user)


@router.patch("/{planning_id}", response_model=PlanningOut)
def update_planning(
    planning_id: int,
    payload: PlanningUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Planning:
    planning = db.scalar(
        select(Planning)
        .where(Planning.id == planning_id)
        .options(selectinload(Planning.rows))
    )
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(planning, key, value)
    if planning.wzc_id:
        wzc = db.get(Wzc, planning.wzc_id)
        if wzc:
            wzc.next_visit = planning.planning_date
    add_audit_log(db, current_user, "Behandelplanning", "Planning bijgewerkt", {"planning": planning.name})
    db.commit()
    db.refresh(planning)
    return planning


@router.post("/{planning_id}/rows", response_model=PlanningOut)
def add_planning_rows(
    planning_id: int,
    rows: list[PlanningRowCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Planning:
    planning = db.scalar(
        select(Planning)
        .where(Planning.id == planning_id)
        .options(selectinload(Planning.rows))
    )
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    next_number = max([row.patient_number for row in planning.rows] or [0]) + 1
    for index, row in enumerate(rows):
        planning.rows.append(
            PlanningRow(
                patient_number=next_number + index,
                patient_name=row.patient_name,
                treatments=row.treatments,
                date_or_period=row.date_or_period,
                remarks=row.remarks,
                patient_done=row.patient_done,
            )
        )
    add_audit_log(db, current_user, "Behandelplanning", "Bewoners toegevoegd", {"planning": planning.name, "aantal": len(rows)})
    db.commit()
    db.refresh(planning)
    return planning


@router.delete("/{planning_id}/rows/{row_id}", response_model=PlanningOut)
def delete_planning_row(
    planning_id: int,
    row_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Planning:
    planning = db.scalar(
        select(Planning)
        .where(Planning.id == planning_id)
        .options(selectinload(Planning.rows))
    )
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    row = next((item for item in planning.rows if item.id == row_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Bewoner niet gevonden in planning.")
    db.delete(row)
    add_audit_log(db, current_user, "Behandelplanning", "Bewoner verwijderd uit planning", {"planning": planning.name})
    db.commit()
    db.refresh(planning)
    return planning


@router.delete("/{planning_id}")
def delete_planning(
    planning_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    planning = db.get(Planning, planning_id)
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    name = planning.name
    if planning.wzc_id:
        wzc = db.get(Wzc, planning.wzc_id)
        if wzc and wzc.next_visit == planning.planning_date:
            wzc.next_visit = None
    db.delete(planning)
    add_audit_log(db, current_user, "Behandelplanning", "Planning verwijderd", {"planning": name})
    db.commit()
    return {"status": "deleted"}


@router.get("/{planning_id}/excel")
def download_planning_excel(
    planning_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StreamingResponse:
    planning = db.scalar(
        select(Planning)
        .where(Planning.id == planning_id)
        .options(selectinload(Planning.rows))
    )
    if not planning:
        raise HTTPException(status_code=404, detail="Planning niet gevonden.")
    output = planning_service.build_excel_file(
        planning.name,
        planning.planning_date,
        planning.location,
        planning_rows_for_excel(planning),
        planning.planning_type,
    )
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "_", planning.name.strip() or "planning")
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.xlsx"'},
    )
