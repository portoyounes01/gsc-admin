# Care-centre Portal Foundation Design

## Intent

Add the ownership foundation for a future care-centre portal while keeping the existing PostgreSQL database and internal dashboard intact.

## Approved decisions

- The portal and admin dashboard use the same PostgreSQL database.
- Portal accounts are separate from internal `users` accounts.
- Each portal account belongs to exactly one `wzc`.
- The backend derives the centre scope from the authenticated portal account; caller-supplied `wzc_id` values are never authoritative.
- Existing `urgencies.wzc_id` and `plannings.wzc_id` remain the ownership source.
- `planning_rows` inherit ownership through `planning_id`; no copied `wzc_id` is added.
- Portal responses will use dedicated schemas rather than internal response models.
- Patient-identifying fields are excluded from the initial portal contract.
- Appointments and services remain a later decision; no duplicate source-of-truth tables are created in this foundation slice.

## Scope of this slice

- Add a `portal_accounts` SQLAlchemy model linked to `wzcs.id`.
- Add additive local schema creation support for the new table, consistent with the current beta startup approach.
- Add model-level tests for one-centre ownership, unique email, and inactive accounts.
- Add test fixtures/design boundaries for later cross-centre API isolation tests.

## Non-goals

- No portal login endpoint yet.
- No portal UI yet.
- No changes to internal user authorization.
- No new appointment/service tables.
- No data migration of existing users or operational records.
- No Docker or external provider calls.

## Initial portal account fields

`portal_accounts` contains: `id`, `wzc_id` (required foreign key), `email` (unique/indexed), `password_hash`, `role`, `is_active`, `created_at`, and `updated_at`.

The account email is normalized by the service layer in a later authentication slice. This foundation does not silently convert existing internal users into portal accounts.

## Security boundary

Every future portal request must resolve `portal account → wzc_id → scoped query`. Cross-centre records must be treated as not found. Portal account records and audit metadata must not contain patient details.
