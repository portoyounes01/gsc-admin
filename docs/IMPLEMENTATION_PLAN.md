# Implementation plan — production-ready beta

## Outcome

Make the dashboard safe to operate, predictable to change, and inexpensive to develop and run.

## Non-goals

- Replacing DentAdmin.
- Adding a full patient dossier.
- Introducing live traffic routing before core data protection and deployment controls are complete.
- Rewriting the existing frontend or backend without evidence of a concrete problem.

## Work sequence

### Phase 0 — establish a reliable baseline

**Deliverables:** reproducible local setup, passing test command, documented environment variables.

- Verify backend test discovery and add a single canonical test command.
- Verify frontend type-check/build and the no-Axios guard.
- Add a safe `.env.example` with no usable credentials.
- Record the exact local and production commands in the README.

**Exit criteria:** a new developer can run checks without external routing or geocoding access.

### Phase 1 — remove deployment foot-guns

**Deliverables:** secure startup behavior and explicit environment checks.

- Reject placeholder `SECRET_KEY` and default bootstrap passwords when `ENVIRONMENT` is not local.
- Add a startup warning or health indicator for disabled/failed outbound providers.
- Separate development Compose settings from production settings.
- Add reverse proxy/HTTPS and a backup/restore runbook.

**Exit criteria:** a production-like environment cannot start with known default credentials.

### Phase 2 — controlled database changes

**Deliverables:** Alembic migration history and rollback-aware deployment procedure.

- Create an initial migration matching the current SQLAlchemy schema.
- Replace startup schema creation for non-local environments.
- Add migration checks to deployment.
- Document backup before migration and restore verification.

**Exit criteria:** schema changes are reviewable, repeatable, and safe to deploy.

### Phase 3 — permissions and privacy

**Deliverables:** permission matrix and retention policy.

- Define roles and actions per module: read, create, update, complete, export, admin.
- Enforce permissions server-side; treat frontend hiding as convenience only.
- Review every audit event for patient-data leakage.
- Add retention and deletion behavior for planning rows, urgencies, and audit logs.

**Exit criteria:** each sensitive action has an explicit authorization rule and test.

### Phase 4 — reduce external calls and runtime cost

**Deliverables:** deterministic provider boundaries and measurable cache behavior.

- Normalize address strings before geocoding and cache successful and negative results with a TTL.
- Keep `estimate` as the default local/test provider.
- Add a shared cache for multi-worker deployments if external routing is enabled.
- Add timeout, retry, rate-limit, and provider-failure metrics.
- Make provider calls injectable in tests.

**Exit criteria:** repeated identical operations do not repeat paid or rate-limited calls unnecessarily.

### Phase 5 — harden document workflows

**Deliverables:** fixture PDFs, explicit extraction confidence/remarks, stable Excel output.

- Add representative synthetic PDFs for labeled names, scanned/no-text PDFs, duplicate names, and missing treatment tables.
- Test the normalizers independently from API routes.
- Keep patient-like fixtures synthetic and out of Git history.
- Add an operator review checklist for low-confidence extraction.

**Exit criteria:** extraction changes are caught by focused tests and uncertainty is visible to operators.

### Phase 6 — release readiness

**Deliverables:** release checklist, monitoring, and rollback procedure.

- Run backend tests, frontend build, security/config checks, and a smoke test against a clean database.
- Verify backups can restore.
- Verify health endpoints and provider-disabled behavior.
- Tag the release with a short changelog and known limitations.

## Recommended task format

Every future change should be written as:

```text
Goal: one observable outcome
Scope: exact module/files if known
Non-goals: what must not change
Acceptance: 3–7 concrete checks
Verification: smallest relevant command(s)
Risk: data, privacy, external API, or migration risk
```

## Priority order

Do Phase 0, then P0/P1 items in Phases 1–4. Treat UI polish, map upgrades, and extra features as lower priority until security, migrations, permissions, and backups are reliable.

