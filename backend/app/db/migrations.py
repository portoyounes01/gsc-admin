from __future__ import annotations

from sqlalchemy import Engine, Connection, inspect, text

from app.db.session import engine
from app.services.portal_accounts import username_for_centre


def ensure_portal_account_schema(bind: Engine | Connection = engine) -> None:
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "portal_accounts" not in tables or "wzcs" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("portal_accounts")}
    legacy_email_column = "email" in columns and "username" not in columns
    if "username" not in columns and not legacy_email_column:
        raise RuntimeError("Portal-account table has neither username nor legacy email column.")

    with bind.begin() as connection:
        duplicate_centre = connection.execute(text(
            "SELECT wzc_id FROM portal_accounts GROUP BY wzc_id HAVING COUNT(*) > 1 LIMIT 1"
        )).scalar()
        if duplicate_centre is not None:
            raise RuntimeError("Cannot migrate portal accounts: multiple portal accounts exist for one WZC.")

        rows = connection.execute(text(
            "SELECT portal_accounts.id, wzcs.name FROM portal_accounts "
            "JOIN wzcs ON wzcs.id = portal_accounts.wzc_id ORDER BY portal_accounts.id"
        )).all()
        used: set[str] = set()
        usernames = [(account_id, username_for_centre(name, used)) for account_id, name in rows]
        used.update(username for _, username in usernames)

        if legacy_email_column:
            connection.execute(text("ALTER TABLE portal_accounts RENAME COLUMN email TO username"))
        for account_id, username in usernames:
            connection.execute(
                text("UPDATE portal_accounts SET username = :username WHERE id = :id"),
                {"username": username, "id": account_id},
            )
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_portal_accounts_username ON portal_accounts (username)"
        ))
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
                        id INTEGER PRIMARY KEY,
                        wzc_id INTEGER NOT NULL REFERENCES wzcs(id),
                        username VARCHAR(255) NOT NULL UNIQUE,
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
            connection.execute(text("CREATE UNIQUE INDEX ix_portal_accounts_username ON portal_accounts (username)"))
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
