#!/usr/bin/env bash
# One-command install/update for a fresh Ubuntu server. Safe to re-run: every step skips work already done.
# Usage (as root, from the deploy folder): ./install.sh
set -euo pipefail

cd "$(dirname "$0")"

step() { printf '\n==> %s\n' "$1"; }
die() { printf '\nSTOPPED: %s\n' "$1"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (or with sudo)."

step "Docker"
if command -v docker >/dev/null 2>&1; then
  echo "already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
fi

step "Swap (OSRM preprocessing needs ~6 GB RAM+swap)"
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
if [ $(( (mem_kb + swap_kb) / 1024 )) -ge 6000 ]; then
  echo "enough memory available"
elif [ -e /swapfile ]; then
  die "/swapfile exists but total memory is still under 6 GB; enlarge it manually."
else
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "added 4 GB swap"
fi

step "Configuration (.env)"
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$(openssl rand -hex 32)|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  die "created .env with random SECRET_KEY and POSTGRES_PASSWORD.
Now edit it (nano .env): ADMIN_HOST, API_HOST, CORS_ORIGINS, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD.
Then run ./install.sh again."
fi
if grep -qE 'example\.be|CHANGE-ME' .env; then
  grep -nE 'example\.be|CHANGE-ME' .env
  die "the lines above in .env still have placeholder values. Edit them (nano .env) and run ./install.sh again."
fi
echo ".env looks filled in"

step "Road routing data (OSRM, Belgium)"
if [ -f osrm-data/belgium-latest.osrm.cell_metrics ]; then
  echo "already prepared (run ./osrm-prepare.sh to refresh road data)"
else
  ./osrm-prepare.sh
fi

step "Build and start"
docker compose up -d --build

step "Waiting for backend"
for _ in $(seq 1 60); do
  if docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" >/dev/null 2>&1; then
    echo "backend is up"
    break
  fi
  sleep 3
done || true
docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" >/dev/null 2>&1 \
  || die "backend did not become healthy. Check: docker compose logs backend --tail 50"

step "Routing check (Brussels -> Antwerp)"
docker compose exec -T backend python -c "from app.services.routing import build_travel_matrix, Coordinates as C; r=build_travel_matrix([C(50.8503,4.3517), C(51.2194,4.4025)]); print(r.provider, round(r.distances_km[0][1], 1), 'km', round(r.durations_minutes[0][1]), 'min', r.warnings)"

api_host=$(sed -n 's/^API_HOST=//p' .env)
admin_host=$(sed -n 's/^ADMIN_HOST=//p' .env)
printf '\nDone.\n  Dashboard: https://%s\n  API:       https://%s\n' "$admin_host" "$api_host"
echo "HTTPS certificates are issued automatically on first visit once DNS points at this server."
