from __future__ import annotations

from sqlalchemy import Engine, Connection, inspect, text

from app.db.session import engine


def ensure_portal_account_schema(bind: Engine | Connection = engine) -> None:
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "portal_accounts" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("portal_accounts")}

    with bind.begin() as connection:
        # If table was previously migrated to use username, rename it back to email
        if "username" in columns and "email" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts RENAME COLUMN username TO email"))
            connection.execute(text("DROP INDEX IF EXISTS ix_portal_accounts_username"))
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_portal_accounts_email ON portal_accounts (email)"
            ))

        # Add missing columns defensively
        columns = {column["name"] for column in inspect(connection).get_columns("portal_accounts")}
        if "email" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN email VARCHAR(255)"))
        if "password_hash" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN password_hash VARCHAR(255)"))
        if "role" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN role VARCHAR(40) DEFAULT 'staff'"))
        if "is_active" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
        if "created_at" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
        if "updated_at" not in columns:
            connection.execute(text("ALTER TABLE portal_accounts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))

        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_accounts_wzc_id ON portal_accounts (wzc_id)"
        ))


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
                        id SERIAL PRIMARY KEY,
                        wzc_id INTEGER NOT NULL REFERENCES wzcs(id),
                        email VARCHAR(255) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(40) NOT NULL DEFAULT 'staff',
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                    )
                    """
                )
            )
            connection.execute(text("CREATE INDEX ix_portal_accounts_wzc_id ON portal_accounts (wzc_id)"))
            connection.execute(text("CREATE UNIQUE INDEX uq_portal_accounts_wzc_id ON portal_accounts (wzc_id)"))

    ensure_portal_account_schema(engine)

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
