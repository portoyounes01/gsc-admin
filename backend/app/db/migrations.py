from __future__ import annotations

from sqlalchemy import inspect, text

from app.db.session import engine


def ensure_lightweight_schema() -> None:
    """Apply small additive schema updates for local beta databases."""
    inspector = inspect(engine)
    if "wzcs" not in inspector.get_table_names():
        return

    if "portal_accounts" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE portal_accounts (
                        id INTEGER PRIMARY KEY,
                        wzc_id INTEGER NOT NULL REFERENCES wzcs(id),
                        email VARCHAR(255) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(40) NOT NULL DEFAULT 'staff',
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    )
                    """
                )
            )
            connection.execute(text("CREATE INDEX ix_portal_accounts_wzc_id ON portal_accounts (wzc_id)"))
            connection.execute(text("CREATE INDEX ix_portal_accounts_email ON portal_accounts (email)"))

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
