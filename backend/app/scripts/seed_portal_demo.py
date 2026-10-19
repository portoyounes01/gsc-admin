"""Create repeatable synthetic portal data in a local development database.

Run with PORTAL_DEMO_PASSWORD set and --confirm-local-demo. Existing non-demo
records are never changed, and reruns do not duplicate the demo records.
"""

from __future__ import annotations

import argparse
import os
from datetime import date, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Planning, PlanningRow, PortalAccount, Urgency, Wzc


CENTRE_COUNT = 37
DEMO_PREFIX = "portal-demo-"
VISITS = (
    (-120, "Screening", "Uitgevoerd", "09:00", "12:00"),
    (-45, "Behandeling", "Uitgevoerd", "10:00", "15:00"),
    (-9, "Screening", "Uitgevoerd", "08:30", "11:30"),
    (3, "Screening", "Bevestigd", "09:00", "12:00"),
    (16, "Behandeling", "Gepland", "13:00", "16:00"),
    (47, "Screening", "Gepland", "10:00", "13:00"),
)
URGENCIES = (
    (-18, "Prothese gebroken", "Afgerond"),
    (-2, "Tandpijn", "Open"),
)
LOCATIONS = (
    ("Antwerpen", "2000", 51.2194, 4.4025),
    ("Berchem", "2600", 51.1991, 4.4329),
    ("Deurne", "2100", 51.2217, 4.4610),
    ("Merksem", "2170", 51.2482, 4.4455),
    ("Wilrijk", "2610", 51.1701, 4.3943),
    ("Mortsel", "2640", 51.1710, 4.4520),
    ("Mechelen", "2800", 51.0259, 4.4776),
    ("Boom", "2850", 51.0890, 4.3710),
    ("Brussel", "1000", 50.8467, 4.3525),
    ("Schaarbeek", "1030", 50.8675, 4.3760),
    ("Elsene", "1050", 50.8280, 4.3660),
    ("Anderlecht", "1070", 50.8366, 4.3060),
    ("Etterbeek", "1040", 50.8330, 4.3890),
    ("Sint-Gillis", "1060", 50.8266, 4.3440),
    ("Ukkel", "1180", 50.8010, 4.3370),
    ("Vilvoorde", "1800", 50.9281, 4.4294),
    ("Zaventem", "1930", 50.8837, 4.4729),
    ("Grimbergen", "1850", 50.9349, 4.3727),
)


def seed(password: str, today: date | None = None) -> dict[str, int]:
    if settings.environment != "local":
        raise RuntimeError("Portal demo data is allowed only when ENVIRONMENT=local.")
    if len(password) < 12:
        raise ValueError("PORTAL_DEMO_PASSWORD must contain at least 12 characters.")

    today = today or date.today()
    counts = {"centres": 0, "locations_updated": 0, "accounts": 0, "plannings": 0, "rows": 0, "urgencies": 0}
    with SessionLocal.begin() as db:
        for number in range(1, CENTRE_COUNT + 1):
            code = f"{number:03d}"
            external_id = f"{DEMO_PREFIX}{code}"
            city, postal_code, city_latitude, city_longitude = LOCATIONS[(number - 1) % len(LOCATIONS)]
            name = f"DEMO Zorgcentrum {city} {code}"
            latitude = round(city_latitude + ((number * 7) % 9 - 4) * 0.001, 6)
            longitude = round(city_longitude + ((number * 11) % 9 - 4) * 0.001, 6)
            centre = db.scalar(select(Wzc).where(Wzc.external_id == external_id))
            if centre is None:
                centre = Wzc(
                    external_id=external_id,
                    name=name,
                    group_name="Portal demo (synthetisch)",
                    collaboration_status="Actief",
                    remark="Synthetische lokale testdata; geen echte bewoners.",
                )
                db.add(centre)
                db.flush()
                counts["centres"] += 1
            elif (centre.name, centre.city, centre.postal_code, centre.latitude, centre.longitude) != (name, city, postal_code, latitude, longitude):
                counts["locations_updated"] += 1
            centre.name = name
            centre.address = f"Demolaan {number}"
            centre.postal_code = postal_code
            centre.city = city
            centre.latitude = latitude
            centre.longitude = longitude
            centre.map_source = "portal-demo-synthetic"
            centre.address_source = "portal-demo-synthetic"

            email = f"portal-demo-{code}@example.com"
            account = db.scalar(select(PortalAccount).where(PortalAccount.email == email))
            if account is None:
                db.add(PortalAccount(
                    email=email,
                    wzc_id=centre.id,
                    password_hash=hash_password(password),
                    role="staff",
                    is_active=True,
                ))
                counts["accounts"] += 1
            elif account.wzc_id != centre.id:
                raise RuntimeError(f"Existing demo email belongs to a different WZC: {email}")

            for visit_number, (offset, kind, state, start, end) in enumerate(VISITS, 1):
                visit_date = today + timedelta(days=offset)
                visit_name = f"DEMO-{code}-{visit_number:02d} {kind}"
                existing = db.scalar(select(Planning).where(
                    Planning.name == visit_name,
                    Planning.wzc_id == centre.id,
                    Planning.created_by == "portal-demo-seed",
                ))
                if existing is not None:
                    existing.location = name
                    continue
                planning = Planning(
                    name=visit_name,
                    planning_type=kind,
                    planning_date=visit_date,
                    start_time=start,
                    end_time=end,
                    planning_status=state,
                    team_label="DEMO Mondzorgteam",
                    location=centre.name,
                    wzc_id=centre.id,
                    note="Synthetische afspraak voor portaalcontrole.",
                    created_by="portal-demo-seed",
                )
                db.add(planning)
                counts["plannings"] += 1
                if offset < 0:
                    for resident_number in range(1, 3):
                        planning.rows.append(PlanningRow(
                            patient_number=resident_number,
                            patient_name=f"Demo Bewoner {code}-{resident_number}",
                            treatments="DEMO controle" if kind == "Screening" else "DEMO behandeling",
                            date_or_period=visit_date.isoformat(),
                            remarks="Synthetische testregel",
                            patient_done=True,
                        ))
                        counts["rows"] += 1

            for urgency_number, (offset, kind, state) in enumerate(URGENCIES, 1):
                patient_name = f"Demo Urgentie {code}-{urgency_number}"
                existing = db.scalar(select(Urgency).where(
                    Urgency.wzc_id == centre.id,
                    Urgency.patient_name == patient_name,
                ))
                if existing is not None:
                    existing.wzc_name = name
                    continue
                db.add(Urgency(
                    reported_on=today + timedelta(days=offset),
                    wzc_id=centre.id,
                    wzc_name=centre.name,
                    patient_name=patient_name,
                    urgency_type=kind,
                    status=state,
                    remark="Synthetische portaalmelding.",
                ))
                counts["urgencies"] += 1
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed 37 synthetic care centres for local portal testing.")
    parser.add_argument("--confirm-local-demo", action="store_true")
    args = parser.parse_args()
    if not args.confirm_local_demo:
        parser.error("Pass --confirm-local-demo to add synthetic records to the local database.")
    password = os.environ.get("PORTAL_DEMO_PASSWORD", "")
    if not password:
        parser.error("Set PORTAL_DEMO_PASSWORD before running this script.")
    print(seed(password))


if __name__ == "__main__":
    main()
