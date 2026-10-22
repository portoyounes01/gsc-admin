# Admin dashboard: self-hosted deploy kit

A production-like copy of the admin stack (PostgreSQL + FastAPI + React + HTTPS proxy)
that runs on any Linux VPS with Docker. Use it to test before handing over to the real host.

The client portal is not included.

## What you need

- A VPS with Ubuntu 22.04/24.04 (2 GB RAM is enough), SSH access
- Docker and Docker Compose plugin (`curl -fsSL https://get.docker.com | sh`)
- Two DNS A records pointing at the VPS IP, e.g. `admin.example.be` and `api.example.be`
- Ports 80 and 443 open in the firewall

## Deploy

```bash
git clone <repo> gsc && cd gsc/deploy
cp .env.example .env
nano .env                    # set hostnames, passwords, SECRET_KEY, CORS_ORIGINS
docker compose up -d --build
docker compose logs -f backend   # wait for "Application startup complete"
```

Then run the smoke test from your own machine or the VPS:

```bash
./smoke_test.sh https://api.example.be https://admin.example.be admin@example.be 'your-password'
```

Open `https://admin.example.be` and log in with the bootstrap admin.

## Updating

```bash
git pull && docker compose up -d --build
./smoke_test.sh ...
```

## Handover checklist

Before handing the repo to the real host, confirm all of these:

- [ ] `docker compose up -d --build` works from a clean clone with only `.env` added
- [ ] `smoke_test.sh` passes end to end
- [ ] `.env` is not committed (check `.gitignore`)
- [ ] `SECRET_KEY`, `POSTGRES_PASSWORD` and `BOOTSTRAP_ADMIN_PASSWORD` are not the defaults
- [ ] Database port is not reachable from outside (`nc -zv <vps-ip> 5432` should fail)
- [ ] Data survives a restart (`docker compose down && docker compose up -d`)
- [ ] Backup works: `docker compose exec db pg_dump -U gsc gsc_dashboard > backup.sql`
- [ ] Migrations run on an existing database (restart backend against a copy of your data)
- [ ] Frontend deep links work after a refresh (see caveats)

## Caveats

- **Frontend API URL is fixed at build time.** If `API_HOST` changes, rebuild the frontend.
- **Level27 may differ.** Their environment might use a managed Postgres, a different
  reverse proxy, or different env handling. Keep the app config env-driven
  (`DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`) so the move is only config.
- **Schema creation is automatic on startup** (`create_all` plus `ensure_lightweight_schema`).
  There is no Alembic yet, so test any model change against a copy of real data first.
- **The `frontend` image uses plain nginx.** If the admin app uses URL-based routes,
  refreshing a deep link returns 404 until an SPA fallback (`try_files ... /index.html`)
  is added to the nginx config.
