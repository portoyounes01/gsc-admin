from __future__ import annotations

import argparse
import math
from datetime import date, datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import select

from app.db.session import Base, SessionLocal, engine
from app.models import Prospect, TeamProfile, Wzc


def text_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def int_value(value) -> int | None:
    cleaned = text_value(value)
    if not cleaned:
        return None
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def float_value(value) -> float | None:
    cleaned = text_value(value)
    if not cleaned:
        return None
    try:
        number = float(cleaned.replace(",", "."))
    except ValueError:
        return None
    return None if math.isnan(number) else number


def date_value(value) -> date | None:
    if value is None or text_value(value) == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None
    return parsed.date()


def import_wzcs(workbook_path: Path) -> int:
    df = pd.read_excel(workbook_path, sheet_name="WZC_Master")
    saved = 0
    with SessionLocal() as db:
        for _, row in df.iterrows():
            name = text_value(row.get("WZC naam"))
            if not name:
                continue
            collaboration_status = text_value(row.get("Samenwerking status")) or "Actief"
            if collaboration_status.lower() == "groep":
                continue
            external_id = text_value(row.get("WZC ID")) or f"WZC-{saved + 1:03d}"
            wzc = db.scalar(select(Wzc).where(Wzc.external_id == external_id)) or Wzc(external_id=external_id, name=name)
            wzc.name = name
            wzc.group_name = text_value(row.get("Groep/organisatie"))
            wzc.address = text_value(row.get("Adres"))
            wzc.postal_code = text_value(row.get("Postcode"))
            wzc.city = text_value(row.get("Gemeente"))
            wzc.contact_name = text_value(row.get("Hoofdcontact"))
            wzc.contact_role = text_value(row.get("Functie"))
            wzc.email = text_value(row.get("E-mail"))
            wzc.phone = text_value(row.get("Telefoon"))
            wzc.website = text_value(row.get("Website"))
            wzc.collaboration_status = collaboration_status
            wzc.last_visit = date_value(row.get("Laatste bezoek"))
            wzc.next_visit = date_value(row.get("Volgende bezoek"))
            wzc.owner = text_value(row.get("Interne eigenaar"))
            wzc.remark = text_value(row.get("Opmerking"))
            wzc.resident_count = int_value(row.get("Aantal inwoners"))
            wzc.latitude = float_value(row.get("Latitude"))
            wzc.longitude = float_value(row.get("Longitude"))
            wzc.map_source = text_value(row.get("Kaart bron"))
            wzc.address_source = text_value(row.get("Adres bron"))
            db.add(wzc)
            saved += 1
        db.commit()
    return saved


def import_prospects(workbook_path: Path) -> int:
    try:
        df = pd.read_excel(workbook_path, sheet_name="WZC_Prospectie")
    except ValueError:
        return 0
    saved = 0
    with SessionLocal() as db:
        for _, row in df.iterrows():
            name = text_value(row.get("WZC naam"))
            if not name:
                continue
            external_id = text_value(row.get("Prospect ID")) or f"PROS-{saved + 1:03d}"
            prospect = db.scalar(select(Prospect).where(Prospect.external_id == external_id)) or Prospect(external_id=external_id, name=name)
            prospect.name = name
            prospect.group_name = text_value(row.get("Groep/organisatie"))
            prospect.address = text_value(row.get("Adres"))
            prospect.postal_code = text_value(row.get("Postcode"))
            prospect.city = text_value(row.get("Gemeente"))
            prospect.contact_name = text_value(row.get("Hoofdcontact"))
            prospect.contact_role = text_value(row.get("Functie"))
            prospect.email = text_value(row.get("E-mail"))
            prospect.phone = text_value(row.get("Telefoon"))
            prospect.website = text_value(row.get("Website"))
            prospect.latitude = float_value(row.get("Latitude"))
            prospect.longitude = float_value(row.get("Longitude"))
            prospect.map_source = text_value(row.get("Kaart bron"))
            prospect.address_source = text_value(row.get("Adres bron"))
            prospect.contacted_on = date_value(row.get("Aangeschreven op"))
            prospect.channel = text_value(row.get("Kanaal"))
            prospect.response = text_value(row.get("Response"))
            prospect.status = text_value(row.get("Status")) or "Nieuw"
            prospect.meeting_type = text_value(row.get("Gesprekstype"))
            prospect.meeting_date = date_value(row.get("Gespreksdatum"))
            prospect.owner = text_value(row.get("Interne verantwoordelijke"))
            prospect.next_action = text_value(row.get("Volgende actie"))
            prospect.next_action_deadline = date_value(row.get("Deadline volgende actie"))
            prospect.remark = text_value(row.get("Opmerking"))
            db.add(prospect)
            saved += 1
        db.commit()
    return saved


def import_team_profiles(team_profiles_path: Path) -> int:
    if not team_profiles_path.exists():
        return 0
    import json

    data = json.loads(team_profiles_path.read_text(encoding="utf-8"))
    profiles = data.get("profiles", []) if isinstance(data, dict) else []
    saved = 0
    with SessionLocal() as db:
        for profile in profiles:
            name = text_value(profile.get("name"))
            if not name:
                continue
            team_profile = db.scalar(select(TeamProfile).where(TeamProfile.name == name)) or TeamProfile(name=name)
            team_profile.role = text_value(profile.get("function") or profile.get("role")) or "Tandarts"
            team_profile.skillsets = ", ".join(profile.get("skillsets", []) or [])
            team_profile.max_treatments_per_day = int_value(profile.get("max_treatments_per_day"))
            team_profile.remark = text_value(profile.get("remarks"))
            status = text_value(profile.get("status"))
            team_profile.is_active = status not in {"Inactief", "Tijdelijk niet beschikbaar"} and bool(profile.get("is_active", True))
            db.add(team_profile)
            saved += 1
        db.commit()
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description="Importeer bestaande Streamlit data naar PostgreSQL.")
    parser.add_argument("--workbook", required=True, type=Path)
    parser.add_argument("--team-profiles", type=Path)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    wzc_count = import_wzcs(args.workbook)
    prospect_count = import_prospects(args.workbook)
    team_count = import_team_profiles(args.team_profiles) if args.team_profiles else 0
    print(f"Imported: {wzc_count} WZC, {prospect_count} prospecties, {team_count} teamprofielen")


if __name__ == "__main__":
    main()
