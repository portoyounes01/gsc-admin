# Local portal demo data

The local database contains 37 synthetic care centres with external IDs
`portal-demo-001` through `portal-demo-037`. They are distributed across
Antwerp, Brussels, and nearby municipalities. City and postcode are real;
`Demolaan` addresses and small offsets from city-centre coordinates are
deliberately fictional. No actual care centre or resident is represented.

Each centre has its own portal account (`portal-demo-001@example.com` through
`portal-demo-037@example.com`), three completed and three future planning
visits, synthetic planning rows for the completed visits, and one completed
plus one open urgency. The portal's appointment and service views both read
these same planning records. Service records are not independent entities yet.

To add or refresh the demo data in a local Compose database, set a local test
password of at least 12 characters and run:

```bash
docker compose exec -T -e PORTAL_DEMO_PASSWORD=<local-test-password> backend \
  python -m app.scripts.seed_portal_demo --confirm-local-demo
```

The script refuses non-local environments, uses stable demo IDs, and can be
rerun without creating duplicate visits or urgencies. It updates locations
only for centres with the `portal-demo-` external-ID prefix. It does not
change existing non-demo records.

Open `http://localhost:5173/portal`. In the local login screen, search for a
demo centre by name or municipality and select it. The centre's account email
is filled in; enter the local test password used when the data was seeded.
The sidebar then shows the signed-in centre and email. Choose **Afmelden /
wissel zorgcentrum** to sign out and select another centre.

The demo-centre directory is available only when `ENVIRONMENT=local` and
contains only synthetic centres. In other environments, users sign in with
their provisioned email and password. The internal dashboard at
`http://localhost:5173/` shows the same planning and urgency records across
centres. Portal accounts see only their own centre.
