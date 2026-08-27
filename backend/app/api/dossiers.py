from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.models import User
from app.schemas import DossierPreviewRow
from app.services.dossiers import preview_dossier

router = APIRouter(prefix="/dossiers", tags=["dossiers"])


@router.post("/preview", response_model=list[DossierPreviewRow])
async def preview_dossiers(
    files: list[UploadFile] = File(...),
    _: User = Depends(get_current_user),
) -> list[DossierPreviewRow]:
    rows: list[DossierPreviewRow] = []
    for uploaded_file in files:
        if not uploaded_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{uploaded_file.filename} is geen PDF.")
        rows.append(preview_dossier(uploaded_file.filename, await uploaded_file.read()))
    return rows
