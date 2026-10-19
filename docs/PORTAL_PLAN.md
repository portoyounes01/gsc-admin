# Care-centre portal plan

## Purpose

Add a separate website portal for care centres. Each portal account must be
linked to exactly one care centre, and the API must enforce that scope for
every read and write.

## Scope

- Portal authentication and account provisioning
- Centre-scoped appointments
- Centre-scoped services
- Centre-scoped urgency history and urgency submission
- Safe response schemas that do not expose internal dashboard data by default
- Tests proving that one centre cannot access another centre's data

## Proposed API

```text
POST /portal/auth/login
GET  /portal/me
GET  /portal/appointments
GET  /portal/services
GET  /portal/urgencies
POST /portal/urgencies
GET  /portal/urgencies/{id}
```

## Planned structure

```text
backend/app/portal/
  api/
  models/
  schemas/
  services/

frontend/src/portal/
  pages/
  components/
  api.ts
  types.ts
```

## Security rules

- The authenticated account determines the care-centre scope.
- Portal requests must not accept a caller-selected centre ID as authority.
- Ownership must be checked server-side on list, detail, create, update, and
  status-change operations.
- Internal dashboard users and external portal users remain separate concepts.
- Patient information is minimized in portal responses and never added to
  audit metadata.

## Delivery order

1. Define the account-to-centre data model.
2. Add ownership dependencies and authorization tests.
3. Add portal login and account identity.
4. Add the portal shell and overview screen.
5. Add appointments.
6. Add services.
7. Add urgency history and submission.
8. Verify cross-centre isolation and integrate submissions with internal
   urgency workflow.

No portal API implementation is included in this initial organization step.
