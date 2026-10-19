# Low-credit development workflow

This is the default workflow for future edits to this repository. Its purpose is to reduce unnecessary model context, repeated tool calls, external API usage, and rework.

## 1. Choose the smallest useful mode

| Request | Use | Avoid |
|---|---|---|
| Explain behavior | Read-only inspection and answer | Editing files |
| Fix one bug | Reproduce, inspect owning module, patch, focused test | Full-repo rewrite |
| Add one feature | Short design, scoped implementation, focused verification | Simultaneous refactor |
| Release/deploy | Checklist, config audit, smoke test | Ad-hoc production changes |

## 2. Context budget rules

- Start with `rg --files`, then inspect only the owning file and its direct dependencies.
- Search symbols with `rg` before opening large files.
- Read relevant line ranges instead of entire files whenever possible.
- Do not include `node_modules`, build output, database files, PDFs, secrets, or generated lockfile sections unless directly relevant.
- Reuse this documentation map; do not ask for a fresh architecture explanation for every edit.
- Keep unrelated cleanup out of feature changes.

## 3. External-call rules

- Tests use `estimate` routing and mocked geocoding by default.
- Only run real OSRM/Google/geocoding calls when validating provider integration.
- Cache repeated lookups by normalized address or coordinate set.
- Never send patient names, remarks, dossier text, or identifiers to routing/geocoding providers.
- Treat provider calls as budgeted operations: identify why the call is needed before making it.

## 4. Safe edit loop

1. Write the task in the recommended format from `IMPLEMENTATION_PLAN.md`.
2. Locate the owner with `rg`.
3. Read the smallest relevant context.
4. Make one focused patch.
5. Run the cheapest relevant check first.
6. Inspect the diff.
7. Run the broader check only after the focused check passes.
8. Update docs only if behavior, setup, or decisions changed.

## 5. Verification ladder

Use the first level that can answer the question:

1. Static search or type check.
2. One unit/service test.
3. Backend test suite or frontend build.
4. Docker smoke test.
5. External-provider integration test.

Do not jump to Docker or live providers to answer a pure parsing or business-rule question.

## 6. Prompt template for future work

```text
Task: <one sentence>
Observed behavior: <what happens now>
Desired behavior: <what should happen>
Scope: <module/file/endpoint>
Non-goals: <explicit exclusions>
Acceptance checks:
- <check 1>
- <check 2>
Run: <focused verification command>
```

## 7. Definition of done

- The change is limited to the requested scope.
- No secret or patient-like data was added to source, logs, prompts, or fixtures.
- The focused verification passes.
- The diff is reviewed for accidental changes.
- Documentation is updated only when the operational contract changed.
- Any external call, migration, permission change, or retention change is explicitly noted.

