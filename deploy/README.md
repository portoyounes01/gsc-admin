# Admin dashboard: self-hosted deploy kit

The full admin stack on one Linux server with Docker:

| Service    | What it does                                                  | Reachable from internet |
|------------|---------------------------------------------------------------|-------------------------|
| `proxy`    | Caddy: HTTPS (automatic Let's Encrypt) for both hostnames      | yes (80, 443)           |
| `frontend` | React dashboard (nginx)                                        | via proxy               |
| `backend`  | FastAPI API                                                    | via proxy               |
| `db`       | PostgreSQL 16                                                  | no                      |
| `osrm`     | Road routing on Belgian OpenStreetMap data (free, self-hosted) | no                      |

The client portal is a separate project (hosted on Vercel); see "Client portal" below.

## What you need

- A server with Ubuntu 22.04/24.04, SSH access as root. 4 GB RAM recommended;
  `install.sh` adds swap automatically when there is less (needed once to build the road map).
- Two DNS **A records** pointing at the server IP, e.g. `admin.example.be` and `api.example.be`.
  Set these **before** the first start, otherwise HTTPS certificates cannot be issued.
- Firewall, **inbound** rules only: TCP 22 (SSH), 80 and 443 (HTTP/HTTPS). Leave outbound open.
  Do not open 5432 (database), 5000 (OSRM) or 8000 (API).

## Install on a new server

```bash
ssh root@<server-ip>
git clone https://github.com/portoyounes01/gsc-admin.git gsc
cd gsc/deploy
./install.sh
```

The first run installs Docker, adds swap if needed, creates `.env` with a random `SECRET_KEY` and
database password, and stops so you can fill in the rest:

```bash
nano .env      # ADMIN_HOST, API_HOST, CORS_ORIGINS, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
./install.sh   # run again
```

The second run downloads and builds the Belgian road map (5–15 min, one time), builds and starts
all containers, waits until the API is healthy and prints a routing test. A good result looks like:

```
osrm 46.1 km 46 min []
```

Then open `https://<ADMIN_HOST>` and log in with the bootstrap admin, and optionally run the smoke test:

```bash
./smoke_test.sh https://api.example.be https://admin.example.be admin@example.be 'your-password'
```

`install.sh` is safe to re-run at any time; it skips steps that are already done.

## Settings (`deploy/.env`)

All configuration lives in `.env` (never committed). **Do not edit `docker-compose.yml` or `Caddyfile`
on the server**: local edits block `git pull`. If something must differ per server, make it a
variable in `.env`.

| Setting | Notes |
|---|---|
| `ADMIN_HOST`, `API_HOST` | Hostnames only, no `https://`. The API URL is baked into the frontend at build time, so rebuild after changing `API_HOST`. |
| `CORS_ORIGINS` | Comma-separated, no spaces, no trailing `/`. Must contain the dashboard **and** the client portal, e.g. `https://admin.example.be,https://portal.example.be` |
| `ROUTING_PROVIDER` | `osrm` (default, free, real roads, no live traffic), `google` (paid, live traffic; needs `ROUTING_GOOGLE_API_KEY`) or `estimate` (straight line × 1.25). If OSRM/Google fails, the backend falls back to `estimate` automatically. |
| `VITE_CARTO_BASEMAP_KEY` | Map background tiles. CARTO's free basemaps are for non-commercial use; check licensing for production. |

## Updating

```bash
cd ~/gsc/deploy
git pull
docker compose up -d --build
```

Refresh the road data every few months:

```bash
./osrm-prepare.sh && docker compose up -d osrm
```

## Client portal

The portal is a separate repo and talks to this API. For it to work:

1. Its `VITE_API_URL` must be `https://<API_HOST>`. The portal ships a prebuilt `dist/` (Vercel does
   not build it), so rebuild it locally with the new URL and push `dist/`.
2. Its address must be in `CORS_ORIGINS` here, then `docker compose up -d backend`.
3. Portal logins are created in the dashboard under **WZC database → Portaal accounts**.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser says "Failed to fetch" or "blocked by CORS policy" | Usually the backend is down, not CORS. Check `docker compose logs backend --tail 50`. If it is up, check the origin is in `CORS_ORIGINS` (exact, with `https://`). |
| Backend log stops at "Waiting for application startup" | Startup migration is stuck or the DB is unreachable. `docker compose restart backend`; if it persists, read the full log. |
| `git pull` says local changes would be overwritten | Someone edited a tracked file on the server. `git diff` to see it, `git stash`, `git pull`, then move the change into `.env`. |
| SSH asks for a password you never set | You are probably already on the server and ran `ssh` again. Look at the prompt: `root@<server>` means you are in. |
| `osrm-prepare.sh` stops about memory | Run `./install.sh` (adds swap) or add swap manually, then retry. |
| Routing test prints `estimate` or a warning | `docker compose logs osrm --tail 20`; check the three `ROUTING_*` lines in `.env` match `.env.example`. |
| HTTPS certificate errors | DNS not pointing at the server yet, or port 80/443 closed. `docker compose logs proxy --tail 50`. |

## Backups

```bash
docker compose exec db pg_dump -U gsc gsc_dashboard > backup-$(date +%F).sql
```

Copy backups off the server. Restore into an empty database with
`docker compose exec -T db psql -U gsc gsc_dashboard < backup.sql`.

## Handover checklist

- [ ] `./install.sh` works from a clean clone with only `.env` filled in
- [ ] `smoke_test.sh` passes end to end
- [ ] `SECRET_KEY`, `POSTGRES_PASSWORD` and `BOOTSTRAP_ADMIN_PASSWORD` are not the defaults
- [ ] Database, OSRM and API ports are not reachable from outside (`nc -zv <ip> 5432` should fail)
- [ ] Data survives a restart (`docker compose down && docker compose up -d`)
- [ ] Backup and restore tested
- [ ] Routing test prints `osrm`, portal login works from the portal's domain

## Caveats

- **Schema changes run automatically on startup** (`create_all` plus `ensure_lightweight_schema`).
  There is no Alembic yet, so test any model change against a copy of real data first.
- **Other hosts may differ** (managed Postgres, another reverse proxy). Keep config env-driven
  (`DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`) so moving is only configuration.
