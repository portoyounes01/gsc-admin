# Care-centre Portal Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the separate portal-account ownership foundation to the existing admin PostgreSQL database without changing current dashboard behavior.

**Architecture:** Add a `PortalAccount` model linked to one `Wzc`, and add only an additive local-beta schema safeguard for `portal_accounts`. Keep internal `User` records separate. Use tests to pin the ownership and account-state contract before later portal authentication and API work.

**Tech Stack:** Python, SQLAlchemy, PostgreSQL-compatible DDL, unittest/pytest.

**Spec:** `docs/superpowers/specs/2026-10-19-care-centre-portal-foundation-design.md`

## Global Constraints

- Use the existing PostgreSQL database; do not create a second database.
- Do not add `wzc_id` to `planning_rows`.
- Do not trust caller-provided centre identifiers.
- Do not expose patient-identifying fields in portal contracts.
- Do not start Docker or call external APIs.

## Review Focus

- An account cannot exist without a WZC: test required foreign-key ownership.
- Portal emails are unique: test duplicate-account protection at the model/table contract.
- Inactive accounts are represented explicitly: test the default and inactive state.
- Internal users remain separate: test that the new model does not reuse `users`.
- Existing model relationships remain intact: test WZC-to-portal-account relationship.

### Task 1: Add the portal account model

**Files:**
- Modify: `backend/app/models.py`
- Test: `backend/tests/test_portal_foundation.py`

**Interfaces:**
- Produces `PortalAccount` with fields `id`, `wzc_id`, `email`, `password_hash`, `role`, `is_active`, `created_at`, and `updated_at`.

- [ ] Write tests for required WZC ownership, unique email metadata, inactive state, and WZC relationship.
- [ ] Run `pytest backend/tests/test_portal_foundation.py -q` and confirm failure because `PortalAccount` is missing.
- [ ] Implement the SQLAlchemy model and `Wzc.portal_accounts` relationship.
- [ ] Run the focused test and then the full backend suite.

### Task 2: Add additive local schema support

**Files:**
- Modify: `backend/app/db/migrations.py`
- Test: `backend/tests/test_portal_foundation.py`

**Interfaces:**
- Extends `ensure_lightweight_schema()` to create the portal account table only when the existing `wzcs` table is present and the table is absent.

- [ ] Add a test using mocked inspection/engine boundaries that the additive schema path targets `portal_accounts` and does not alter existing operational tables.
- [ ] Run the focused test and confirm failure before implementation.
- [ ] Implement the smallest additive DDL path compatible with the current startup schema approach.
- [ ] Run the focused test and full backend suite.

### Task 3: Review the diff and verify the foundation

**Files:**
- Modify: none unless verification identifies a required correction.

- [ ] Inspect `git diff -- docs backend` and confirm Docker ports, frontend API URL, lifecycle script, and geocoding path were not changed.
- [ ] Run the canonical backend test command from the repository documentation.
- [ ] Report any pre-existing failures separately from this change.
