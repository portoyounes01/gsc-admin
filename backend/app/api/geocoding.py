from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models import User
from app.schemas import AddressSuggestionOut
from app.services.geocoding import suggest_addresses

router = APIRouter(prefix="/geocoding", tags=["geocoding"])


@router.get("/suggest", response_model=list[AddressSuggestionOut])
def address_suggestions(
    q: str = Query(min_length=3, max_length=120),
    _: User = Depends(get_current_user),
) -> list[dict[str, object]]:
    return suggest_addresses(q)
