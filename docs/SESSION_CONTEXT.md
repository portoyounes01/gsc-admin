# Global Smile Care Dashboard — session context

This file is the handoff point for a new chat or development session. Read it
first, then read the linked documentation before inspecting or changing code.

**Last updated:** 2026-10-19  
**Repository:** https://github.com/ADP070203/Dashboard  
**Latest upstream commit checked:** `717f1a335e9758d37e2767c908f115d29a37b4f5` on `main`

## Read first

1. [`SOFTWARE_DOCUMENTATION.md`](SOFTWARE_DOCUMENTATION.md)
2. [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md)
3. [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
4. [`PORTAL_PLAN.md`](PORTAL_PLAN.md)
5. [`AI_WORKFLOW.md`](AI_WORKFLOW.md)
6. The root [`README.md`](../README.md)

## What this project is

The project is an internal Global Smile Care operations dashboard built with
React, Vite, TypeScript, FastAPI, SQLAlchemy, and PostgreSQL. It manages care
centre master data, prospects, urgencies, route planning, screening and
treatment planning, PDF extraction, Excel export, users, and audit metadata.

It is not a replacement for DentAdmin. Patient names and treatment details can
still appear in urgency and planning workflows, so access control and privacy
are important.

## What we inspected

We inspected the repository documentation, Docker configuration, backend
routes, authentication, models, schemas, frontend API client, and tests. The
current backend has authenticated internal routes for WZCs, urgencies,
plannings, users, prospects, teams, dossiers, and audit logs.

The current authentication system has internal users with email, password
hash, role, and active state. It does not yet link users to a care centre.
Most authenticated internal users can access broad operational data, while
admin-only routes protect user management, WZC administration, prospects,
teams, and audit logs.

## Upstream and local state

The latest upstream revision was fetched and compared with the workspace. The
workspace already contains the same application code plus local changes that
must be preserved:

- PostgreSQL host port `5433` instead of `5432`;
- backend host port `8001` instead of `8000`;
- frontend API URL pointing to `http://localhost:8001`;
- Docker lifecycle-script fix in `frontend/Dockerfile`;
- Docker-safe workspace path handling in `backend/app/services/geocoding.py`;
- local planning and documentation files under `docs/`.

The workspace has no usable `.git` directory, so do not assume Git status or
history is available locally. Nothing has been pushed from this workspace.

## Work completed in this session

- Confirmed the upstream repository and latest commit.
- Compared upstream with the local workspace without overwriting local fixes.
- Explained the meaning of WZC: `woonzorgcentrum`, meaning care or residential
  centre.
- Defined the future care-centre website API at a conceptual level.
- Decided to keep `/appointments` and `/services` as separate concepts.
- Generated a visual dashboard concept showing overview, appointments,
  services, urgencies, and a “Nieuwe urgentie melden” action.
- Added the portal organization and plan:
  - `backend/app/portal/`
  - `frontend/src/portal/`
  - `docs/PORTAL_PLAN.md`
- Added system-wide software documentation:
  - `docs/SOFTWARE_DOCUMENTATION.md`
- Updated `docs/README.md` to provide the reading order.

## Portal direction agreed so far

The future website portal will be separate from the internal dashboard. Each
portal account must belong to exactly one care centre. The server, not the
browser, will determine the centre scope from the authenticated account.

The proposed portal routes are:

```text
POST /portal/auth/login
GET  /portal/me
GET  /portal/appointments
GET  /portal/services
GET  /portal/urgencies
POST /portal/urgencies
GET  /portal/urgencies/{id}
```

The portal must use separate response schemas and must not expose internal
dashboard data by default. In particular, patient information should be
minimized and never placed in audit metadata.

## Important security requirements

- Never trust a caller-provided `wzc_id` as proof of ownership.
- Every portal list, detail, create, update, and status operation must enforce
  the authenticated centre scope server-side.
- Centre A must not be able to read, modify, or infer Centre B data.
- Internal users and external portal accounts should remain separate concepts.
- Add tests specifically for cross-centre isolation before portal release.
- Add duplicate or idempotency handling for urgency submissions.
- Keep patient details out of routing/geocoding calls and audit metadata.

## What has not been implemented

- No portal database model exists yet.
- No account-to-centre relationship exists yet.
- No `/portal` API routes exist yet.
- No portal authentication flow exists yet.
- No appointments or services database entities exist yet.
- No portal UI has been built yet; only the folder placeholders and visual
  concept exist.
- No Docker, deployment, or external provider calls were made during the
  planning and documentation work.

## Recommended next step

Before writing portal endpoints, define the account and ownership model:

1. Decide whether each centre has one shared account or multiple named users.
2. Add a centre-portal account or membership model linked to one WZC.
3. Define the permission levels for centre administrators and centre staff.
4. Write isolation tests for two synthetic centres.
5. Only then implement portal authentication and scoped dependencies.

Future sessions should not start by rereading the whole repository. Read this
handoff and the linked documents, then inspect only the files relevant to the
next agreed step.
