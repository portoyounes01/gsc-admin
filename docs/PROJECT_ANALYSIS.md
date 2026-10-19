# Global Smile Care Dashboard — project analysis

**Reviewed:** 2026-10-19  
**Scope:** repository source, configuration, README, Docker Compose, and visible tests  
**Current maturity:** beta scaffold with substantial operational functionality

## 1. What this project is

This is an internal operational dashboard for Global Smile Care. It manages WZC master data, prospects, urgent care requests, route planning, screening/treatment-day planning, PDF treatment-plan extraction, exports, users, and audit metadata.

It is explicitly not a patient database replacement for DentAdmin. The code still handles patient names in urgency and planning workflows, so privacy and access control remain important even though the scope excludes a full patient record.

## 2. Architecture at a glance

| Area | Current implementation | Main responsibility |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Login, modules, forms, maps, planning UI, previews and exports |
| Backend | FastAPI + SQLAlchemy | API, validation, authentication, business rules |
| Database | PostgreSQL in Docker | Durable operational data |
| Documents | `pdfplumber`, `pandas`, `openpyxl` | Extract treatment rows from PDFs and generate Excel output |
| Maps/routing | MapLibre/CARTO UI; estimate/OSRM/Google providers | Geocoding, map display and route matrix calculation |
| Deployment | Docker Compose | Local and Linux beta environment |
| Tests | Python tests currently present | Routing and planning behavior; test discovery should be verified |

## 3. Main domain modules

### Authentication and users

Users have email, password hash, role, active state, and timestamps. A bootstrap admin is created at startup from environment settings. The current README correctly treats bootstrap credentials as beta-only, but production deployment must force a strong secret and a credential rotation procedure.

### WZC and prospects

Both entities hold contact, address, ownership, status, notes, and optional coordinates. WZCs additionally connect to urgencies and planning records. Coordinates are persisted, which is useful for avoiding repeated geocoding calls.

### Urgencies and routes

Urgencies contain reported date, WZC, patient name, urgency type, status, and remark. Routes can use a local estimate, OSRM, or Google Routes. The routing service already has an in-memory matrix cache and a fallback to estimates, but the cache is process-local and therefore resets on restart and does not coordinate across workers.

### Planning and document processing

Planning records represent screening or treatment days. Planning rows hold patient-level treatment details. PDF extraction uses heuristics for names and treatment lines, records uncertainty as remarks, and supports Excel output. This is a high-value workflow and should remain isolated behind service functions with fixture-based tests.

### Audit logs

Audit logs store actor, module, action, metadata JSON, and timestamp. Startup purges old logs. The privacy rule is sound: logs should remain metadata-only and should never contain patient details, INSZ, medication, or dossier content.

## 4. Strengths already present

- Clear separation between frontend, API, services, models, schemas, and scripts.
- External routing is opt-in and defaults to a local estimate.
- Routing sends coordinates rather than patient or dossier content.
- Matrix results are cached for a configurable period.
- PDF extraction writes uncertainty into remarks instead of silently pretending extraction is perfect.
- The frontend explicitly forbids Axios, which prevents dependency drift toward an unapproved HTTP client.
- The README documents beta scope, migration commands, privacy assumptions, and external network requirements.

## 5. Priority risks and gaps

| Priority | Finding | Why it matters | Recommended response |
|---|---|---|---|
| P0 | Default secrets include a known bootstrap password and placeholder secret key | Immediate account and token risk if defaults reach a server | Fail fast in non-local environments; require explicit strong values |
| P0 | `Base.metadata.create_all()` plus lightweight schema repair is used at startup | Schema changes are not a controlled migration history | Introduce Alembic before production beta |
| P1 | Roles exist but fine-grained module permissions are still listed as unfinished | Users may access more operational data than intended | Define permission matrix and enforce it in dependencies and UI |
| P1 | Patient names exist in urgency/planning tables | Privacy impact is higher than a generic CRM | Add retention, access, export, and deletion rules; minimize logs |
| P1 | Geocoding and routing can call public services | Cost, availability, rate limits, and data-transfer concerns | Cache geocoding, normalize address keys, add provider budgets and observability |
| P1 | In-memory routing cache is not shared | Repeated calls after restart or across workers waste external usage | Add durable/Redis cache or persist normalized matrices where appropriate |
| P2 | Docker Compose development settings use reload and bind mounts | Not suitable as a production deployment baseline | Create a production compose/reverse-proxy profile |
| P2 | Test coverage is narrow relative to domain surface | Regressions in auth, imports, permissions, and exports may go unnoticed | Add focused contract and service tests incrementally |
| P2 | API/frontend contracts are implicit | Small backend changes can cause repeated debugging cycles | Document endpoint shapes or generate/consume OpenAPI types |

## 6. Likely sources of wasted AI/tool credits

1. Asking for a full-repository analysis for every small change.
2. Re-reading large files when only one symbol or endpoint is relevant.
3. Mixing discovery, design, implementation, and QA in one oversized request.
4. Re-running Docker builds or external routing calls when a focused unit test would answer the question.
5. Sending sensitive or irrelevant data into prompts instead of using synthetic fixtures.
6. Making broad UI changes without a written acceptance checklist, causing multiple correction rounds.

## 7. Target operating model

Use a small vertical slice: locate the owning module, write the acceptance criteria, change only the necessary files, run the smallest relevant checks, then run one broader verification pass before release. Keep external providers disabled by default in local tests and use deterministic fixtures for geocoding and routing.

