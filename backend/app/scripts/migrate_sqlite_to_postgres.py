from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, MetaData, create_engine, func, select, text

from app.core.config import settings
from app.db.session import Base
from app.models import (  # noqa: F401 - imported so SQLAlchemy registers every table
    AuditLog,
    Planning,
    PlanningRow,
    Prospect,
    SavedUrgencyRoutePlan,
    TeamProfile,
    Urgency,
    User,
    Wzc,
)


TABLES = [
    "users",
    "wzcs",
    "prospects",
    "team_profiles",
    "audit_logs",
    "urgencies",
    "plannings",
    "planning_rows",
    "saved_urgency_route_plans",
]

REPLACE_CONFIRMATION_FLAG = "--confirm-replace"


def parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    return date.fromisoformat(str(value)[:10])


def parse_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        cleaned = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def coerce_value(value: Any, column) -> Any:
    if value is None:
        return None
    if isinstance(column.type, Boolean):
        return bool(value)
    if isinstance(column.type, DateTime):
        return parse_datetime(value)
    if isinstance(column.type, Date):
        return parse_date(value)
    return value


def source_url(path: Path) -> str:
    return f"sqlite:///{path.expanduser().resolve()}"


def quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def table_counts(engine, tables: list[str]) -> dict[str, int]:
    metadata = MetaData()
    metadata.reflect(bind=engine, only=tables)
    counts: dict[str, int] = {}
    with engine.connect() as conn:
        for table_name in tables:
            table = metadata.tables.get(table_name)
            counts[table_name] = 0 if table is None else int(conn.scalar(select(func.count()).select_from(table)) or 0)
    return counts


def print_counts(title: str, counts: dict[str, int]) -> None:
    print(title)
    for table_name, count in counts.items():
        print(f"- {table_name}: {count}")


def has_rows(counts: dict[str, int]) -> bool:
    return any(count > 0 for count in counts.values())


def reset_postgres_sequences(conn, target_tables: list[str]) -> None:
    if conn.dialect.name != "postgresql":
        return
    for table_name in target_tables:
        quoted = quote_identifier(table_name)
        conn.execute(
            text(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{table_name}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {quoted}), 1),
                    (SELECT COUNT(*) FROM {quoted}) > 0
                )
                """
            )
        )


def migrate(source: Path, target_url: str, replace: bool, confirm_replace: bool, dry_run: bool) -> None:
    source_engine = create_engine(source_url(source))
    target_engine = create_engine(target_url, pool_pre_ping=True)

    source_counts = table_counts(source_engine, TABLES)
    print_counts("SQLite bron:", source_counts)

    if dry_run:
        print("Dry-run klaar. Er is niets naar PostgreSQL geschreven.")
        return

    Base.metadata.create_all(bind=target_engine)
    target_counts_before = table_counts(target_engine, TABLES)
    print_counts("PostgreSQL doel voor migratie:", target_counts_before)

    if replace and not confirm_replace:
        raise SystemExit(
            "Stop: --replace wist eerst de PostgreSQL doel-tabellen. "
            f"Voeg {REPLACE_CONFIRMATION_FLAG} toe voor een bewuste eenmalige migratie."
        )

    if not replace and has_rows(target_counts_before):
        raise SystemExit(
            "Stop: PostgreSQL bevat al data. De serverdatabase is de bron van waarheid na de eerste migratie. "
            f"Gebruik alleen --replace {REPLACE_CONFIRMATION_FLAG} als je bewust alle serverdata wil vervangen."
        )

    source_metadata = MetaData()
    source_metadata.reflect(bind=source_engine, only=TABLES)

    with target_engine.begin() as target_conn, source_engine.connect() as source_conn:
        target_tables = [table for table in Base.metadata.sorted_tables if table.name in TABLES]

        if replace:
            for table in reversed(target_tables):
                target_conn.execute(table.delete())

        for target_table in target_tables:
            source_table = source_metadata.tables.get(target_table.name)
            if source_table is None:
                continue

            source_columns = {column.name for column in source_table.columns}
            target_columns = [column for column in target_table.columns if column.name in source_columns]
            rows = source_conn.execute(select(*(source_table.c[column.name] for column in target_columns))).mappings().all()
            if not rows:
                print(f"- {target_table.name}: 0 overgezet")
                continue

            payload = [
                {column.name: coerce_value(row[column.name], column) for column in target_columns}
                for row in rows
            ]
            target_conn.execute(target_table.insert(), payload)
            print(f"- {target_table.name}: {len(payload)} overgezet")

        reset_postgres_sequences(target_conn, [table.name for table in target_tables])

    target_counts = table_counts(target_engine, TABLES)
    print_counts("PostgreSQL doel na migratie:", target_counts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kopieer beta-data van SQLite naar PostgreSQL.")
    parser.add_argument("--source", required=True, type=Path, help="Pad naar local_beta.db of een andere SQLite database.")
    parser.add_argument("--target-url", help="PostgreSQL DATABASE_URL. Standaard wordt DATABASE_URL uit .env gebruikt.")
    parser.add_argument("--replace", action="store_true", help="Maak doel-tabellen eerst leeg voor een exacte beta-copy.")
    parser.add_argument(
        "--confirm-replace",
        action="store_true",
        help="Bevestig expliciet dat bestaande PostgreSQL serverdata overschreven mag worden.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Toon alleen aantallen uit SQLite.")
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"SQLite bestand niet gevonden: {args.source}")

    migrate(args.source, args.target_url or settings.database_url, args.replace, args.confirm_replace, args.dry_run)


if __name__ == "__main__":
    main()
