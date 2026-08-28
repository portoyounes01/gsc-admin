from __future__ import annotations

from sqlalchemy import inspect, text

from app.db.session import engine


def ensure_lightweight_schema() -> None:
    """Apply small additive schema updates for local beta databases."""
    inspector = inspect(engine)
    if "wzcs" not in inspector.get_table_names():
        return

    wzc_columns = {column["name"] for column in inspector.get_columns("wzcs")}
    if "extra_contacts" not in wzc_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE wzcs ADD COLUMN extra_contacts TEXT DEFAULT ''"))

    if "plannings" in inspector.get_table_names():
        planning_columns = {column["name"] for column in inspector.get_columns("plannings")}
        if "planning_type" not in planning_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE plannings ADD COLUMN planning_type VARCHAR(40) DEFAULT 'Behandeling'"))
        additive_planning_columns = {
            "start_time": "VARCHAR(5) DEFAULT '09:00'",
            "end_time": "VARCHAR(5) DEFAULT '16:00'",
            "planning_status": "VARCHAR(80) DEFAULT 'Concept'",
            "team_label": "VARCHAR(255) DEFAULT ''",
            "note": "TEXT DEFAULT ''",
        }
        for column_name, column_sql in additive_planning_columns.items():
            if column_name not in planning_columns:
                with engine.begin() as connection:
                    connection.execute(text(f"ALTER TABLE plannings ADD COLUMN {column_name} {column_sql}"))
