# Global Smile Care Dashboard — software documentation

**Status:** beta documentation  
**Reviewed:** 2026-10-19  
**Audience:** operators, developers, administrators, and future portal implementers

## 1. What the software does

The Global Smile Care Dashboard is an internal operations application for
managing care-centre relationships and dental-care planning. It is not a
replacement for DentAdmin and is not intended to become a complete patient
record system.

The current application supports:

- care-centre (WZC) master data and prospect follow-up;
- urgency registration, completion, and route planning;
- screening and treatment-day planning;
- treatment-plan PDF previews and Excel exports;
- user administration, roles, and audit metadata;
- a planned, separate care-centre portal.

## 2. System architecture

```text
Browser
  └── React + Vite + TypeScript frontend
        └── HTTP JSON requests with fetch
              └── FastAPI backend
                    ├── authentication and authorization
                    ├── SQLAlchemy domain models and validation
                    ├── planning/document services
                    └── PostgreSQL database
```

Docker Compose supplies the local database, backend, and frontend services.
The frontend uses `VITE_API_URL` to locate the backend.

## 3. Repository map

```text
backend/app/main.py          FastAPI application and router registration
backend/app/api/             HTTP endpoints
backend/app/core/            settings and token/password security
backend/app/db/              SQLAlchemy session and startup schema handling
backend/app/models.py        database entities
backend/app/schemas.py       Pydantic request/response contracts
backend/app/services/        audit, routing, geocoding, planning, dossiers
backend/tests/               focused backend tests
frontend/src/App.tsx         internal dashboard application shell
frontend/src/api.ts          authenticated frontend API client
frontend/src/types.ts        frontend data contracts
frontend/src/portal/         reserved care-centre portal module
docs/                        project analysis, plans, and operating guidance
```

## 4. Local setup

1. Copy `.env.example` to `.env` and replace all credentials and secrets.
2. Start the local stack with `docker compose up --build`.
3. Open the frontend at `http://localhost:5173`.
4. Use the backend health endpoint at `http://localhost:8001/health` in the
   current workspace Compose configuration.
5. Use `http://localhost:8001/docs` for the FastAPI OpenAPI interface.

The current workspace uses host port `5433` for PostgreSQL and `8001` for the
backend because the original host ports were already occupied. Container
ports remain `5432` and `8000`.

The bootstrap admin is created from `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD`. These values are suitable only for local beta
use; production-like environments must use explicit strong credentials.

## 5. Backend API organization

The backend registers these current route groups:

| Prefix | Responsibility |
|---|---|
| `/auth` | login and current-user identity |
| `/users` | admin user management |
| `/teams` | team profiles |
| `/wzcs` | care-centre master data |
| `/prospects` | prospect pipeline and conversion |
| `/urgencies` | urgency workflow and route planning |
| `/plannings` | screening/treatment planning and exports |
| `/dossiers` | document preview/extraction |
| `/audit-logs` | administrator-only audit metadata |

All current operational routes require an active bearer-authenticated user.
Admin-only routes additionally require `role == "admin"`.

## 6. Authentication and authorization

Passwords are stored as PBKDF2-SHA256 hashes. Login returns a custom
HMAC-signed bearer token containing the user email, role, and expiry time.
The frontend stores this token in browser `localStorage` and sends it as an
`Authorization: Bearer` header.

Current limitations:

- users are not linked to a care centre;
- ordinary authenticated users can access broad operational lists;
- roles are not yet a complete module permission matrix;
- there is no external care-centre account model;
- there is no portal tenant boundary yet.

The future portal must use separate account-to-care-centre ownership and
server-side scope enforcement. See [`PORTAL_PLAN.md`](PORTAL_PLAN.md).

## 7. Data model

The main entities are:

- `User`: internal account, role, active state, password hash;
- `Wzc`: care-centre master record, contacts, address, status, coordinates;
- `Prospect`: potential care centre before conversion to `Wzc`;
- `Urgency`: patient-related urgent request linked to a WZC;
- `Planning`: screening or treatment day linked optionally to a WZC;
- `PlanningRow`: patient-level rows within a planning record;
- `SavedUrgencyRoutePlan`: stored route snapshot;
- `TeamProfile`: team capability and capacity information;
- `AuditLog`: actor, module, action, metadata, and timestamp.

There is currently no independent appointment or service entity. The planned
portal will keep `/appointments` and `/services` as separate public concepts;
their mapping to current planning data must be defined before implementation.

## 8. Main workflows

### Care-centre management

Administrators create and update WZC records. Address changes can trigger
coordinate refresh through the geocoding service. Deleting a WZC requires a
name confirmation.

### Urgencies

An authenticated dashboard user creates an urgency, optionally linking it to
a WZC. The internal dashboard can list, update, complete, and route-plan
urgent requests. The future portal will create urgencies using the logged-in
centre identity rather than accepting a caller-selected centre ID.

### Planning

Operators can preview uploaded PDFs, review extracted rows, save screening or
treatment planning records, edit rows, and download Excel output. Planning
rows may contain patient names and treatment details and therefore require
strict access control.

### Routing and geocoding

Routing defaults to a local estimate. OSRM and Google Routes are optional.
Provider calls should contain coordinates only; patient names, remarks, and
dossier information must never be sent to external providers.

## 9. Privacy and security rules

- Do not use this system as a second patient database.
- Minimize patient information in API responses and exports.
- Never put patient names, INSZ, medication, or dossier contents in audit
  metadata.
- Keep external providers disabled in tests and local workflows unless needed.
- Replace placeholder secrets before any server deployment.
- Add retention and deletion rules for patient-related planning and urgency
  data.
- Enforce authorization in backend queries; frontend hiding is not security.

## 10. Testing and verification

Backend tests currently cover routing and planning behavior. Frontend checks
are provided by the TypeScript build and the no-Axios guard:

```bash
cd backend
pytest

cd ../frontend
npm run check:no-axios
npm run build
```

Before portal implementation, add tests for:

- account-to-centre ownership;
- list and detail isolation between two centres;
- create requests assigning ownership server-side;
- attempts to submit or access another centre's ID;
- safe response fields and urgency duplicate handling.

## 11. Deployment and operational gaps

The current Compose setup is a beta/development setup. Before production
use, the project still needs controlled Alembic migrations, production
reverse proxy and HTTPS, secure startup checks, backup/restore verification,
broader authorization tests, and monitoring.

See [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md) and
[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for the prioritized gaps.

## 12. Documentation map

- [`README.md`](../README.md): quick start and operational notes;
- [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md): architecture, strengths, and
  risks;
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md): production-readiness
  sequence;
- [`AI_WORKFLOW.md`](AI_WORKFLOW.md): focused development workflow;
- [`PORTAL_PLAN.md`](PORTAL_PLAN.md): future care-centre portal design;
- this document: system-wide software reference.
