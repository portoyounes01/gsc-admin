# Care-centre portal data model and isolation design

**Status:** design only — not implemented  
**Reviewed:** 2026-10-19  
**Purpose:** define ownership and access boundaries before changing the database or API

## 1. Safety boundary

The portal must keep each care centre's data separate. A logged-in portal
account may access only the care centre assigned to that account.

The browser must never be trusted to select the care centre. The backend must
derive the centre from the authenticated account and apply that scope to every
query and mutation.

This document does not authorize database changes, API implementation, data
migration, or deployment changes.

## 2. Current database facts

The current database snapshot contains these relevant relationships:

```text
urgencies.wzc_id → wzcs.id
plannings.wzc_id → wzcs.id
planning_rows.planning_id → plannings.id
```

The supplied snapshot reports:

```text
37 plannings: 37 linked to a WZC, 0 without a WZC
1 urgency:     1 linked to a WZC, 0 without a WZC
```

This means existing planning and urgency data already has a usable centre
relationship. Planning rows inherit their centre through their parent
planning and should not receive a second copied `wzc_id` unless a later design
proves that it is necessary.

## 3. Current limitations

The current `users` table has no centre relationship:

```text
users(id, email, password_hash, role, is_active, created_at, updated_at)
```

The current internal APIs are not tenant-isolated. They are designed for
trusted internal dashboard users and can return broad operational data to an
authenticated user. They must not be reused directly as the external portal
API without adding explicit authorization boundaries.

The current system also has no separate appointment or service tables.
Existing `plannings` records contain date, time, type, status, team, location,
and optional WZC information. The portal may initially read from planning data,
but the public concepts `/appointments` and `/services` must have separate
response contracts.

## 4. Proposed account model

Use a separate portal-account concept for external care-centre users. Do not
turn an external account into an internal admin account by assigning a special
role string.

Conceptual relationship:

```text
Wzc
 └── PortalAccount(s)
       ├── email
       ├── password or identity-provider reference
       ├── role
       └── is_active
```

Each portal account belongs to exactly one WZC in the first version.

The exact implementation may be either:

1. a separate `portal_accounts` table linked to `wzcs.id`; or
2. a shared account table with an explicit account type and `wzc_id`.

The preferred option is a separate portal-account table because it keeps
external access separate from existing internal users and makes accidental
privilege expansion less likely.

## 5. Ownership rules

| Data | Current owner relationship | Portal rule |
|---|---|---|
| WZC master data | `wzcs.id` | Expose only approved centre profile fields |
| Urgency | `urgencies.wzc_id` | Account's WZC only |
| Planning | `plannings.wzc_id` | Account's WZC only |
| Planning row | `planning_rows.planning_id → plannings.wzc_id` | Access only through an allowed planning |
| Appointment | To be defined | Must have one WZC owner |
| Service | To be defined | Must have one WZC owner |
| Saved route plan | No direct WZC FK | Internal-only initially |
| Team profile | Global/internal | Internal-only initially |
| Prospect | No WZC ownership | Internal-only |
| Audit log | Global/internal | Internal-only |

## 6. How authorization must work

For every portal request:

```text
Bearer token
  → authenticated portal account
  → account.wzc_id
  → scoped database query
  → safe portal response schema
```

Examples:

```text
GET /portal/urgencies
  WHERE urgencies.wzc_id = authenticated_account.wzc_id

GET /portal/plannings/{id}
  WHERE plannings.id = requested_id
    AND plannings.wzc_id = authenticated_account.wzc_id

POST /portal/urgencies
  assign wzc_id from authenticated_account.wzc_id
  ignore any submitted wzc_id or wzc_name
```

A request for another centre's record should normally return `404`, so the API
does not reveal whether that record exists. The behavior must be consistent
across list, detail, export, update, completion, and delete operations.

## 7. Appointments and services

The portal will keep these as separate public concepts:

```text
Appointment: a scheduled moment or visit
Service:     the care activity delivered or planned
```

Example:

```text
Appointment: Team visit at Centre A on 12 November at 09:00
Service:     Screening service delivered during that visit
```

Both must have an explicit WZC owner. If one appointment can contain multiple
services, the relationship should be:

```text
Appointment 1 ───< Services
      └────────── WZC owner
```

Before implementation, decide whether existing planning records are the
source for both concepts or whether new appointment/service entities are
needed. Do not create duplicate records without defining which system is the
source of truth.

## 8. Portal-visible data

The portal should use dedicated response schemas rather than returning
internal `WzcOut`, `UrgencyOut`, or `PlanningOut` objects directly.

Initial safe default:

- centre profile: name, address, approved contact details;
- appointments: date, time, type, status, and safe operational notes;
- services: date, type, status, and safe summary;
- urgencies: reference, date, category, status, and centre-visible remarks;
- patient-identifying fields: only if explicitly required and approved.

Internal fields such as route-planning internals, audit metadata, team
profiles, prospect data, and unrestricted planning rows should not be exposed
by default.

## 9. Required isolation tests

Use two synthetic WZCs, Centre A and Centre B, with separate portal accounts.
Before portal release, tests must prove:

- Centre A lists only its own appointments, services, and urgencies;
- Centre A receives no data when requesting Centre B's record ID;
- Centre A cannot create an urgency for Centre B;
- Centre A cannot update or complete Centre B's urgency;
- changing `wzc_id` or `wzc_name` in a request does not change ownership;
- inactive portal accounts cannot access data;
- internal admin access remains separate from portal access;
- portal response schemas do not include unapproved sensitive fields.

## 10. Data integrity protections

Before implementation, verify the database has the expected foreign keys,
unique constraints, indexes, and delete behavior. The first implementation
should not rewrite existing WZC, urgency, or planning data.

Recommended protections:

- foreign key from portal account to `wzcs.id`;
- non-null WZC ownership for portal-created urgencies;
- indexes on ownership fields used in portal queries;
- uniqueness for portal account email;
- explicit handling for inactive or deleted WZCs;
- migration with a backup and rollback procedure before production use.

## 11. Decisions still required

These decisions must be confirmed before implementation:

1. One shared centre login or multiple named portal accounts per centre?
2. Password login or an external identity provider?
3. Which patient fields, if any, may appear in the portal?
4. Are appointments and services backed by new tables or existing planning data?
5. Can a centre see completed history, and how far back?
6. Can centre users update or close their own urgencies?
7. What duplicate-submission behavior is required?

## 12. Implementation gate

Do not implement portal endpoints until:

- the account model is approved;
- appointment/service ownership is defined;
- portal-visible fields are approved;
- isolation tests are specified;
- a migration and rollback approach is selected.
