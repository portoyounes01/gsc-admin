#!/usr/bin/env bash
# Usage: ./smoke_test.sh https://api.example.be https://admin.example.be admin@example.be 'password'
set -euo pipefail

API="${1:?API base URL}"
ADMIN="${2:?admin frontend URL}"
EMAIL="${3:?admin email}"
PASSWORD="${4:?admin password}"

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; exit 1; }

curl -fsS "$API/health" | grep -q '"ok"' && pass "API /health" || fail "API /health"
curl -fsS "$API/health/geocoding" >/dev/null && pass "API /health/geocoding" || fail "API /health/geocoding"
curl -fsSI "$ADMIN" | head -1 | grep -q '200' && pass "Frontend serves admin page" || fail "Frontend serves admin page"

TOKEN=$(curl -fsS -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p') || true
[ -n "${TOKEN:-}" ] && pass "Login returns token" || fail "Login returns token"

curl -fsS "$API/auth/me" -H "Authorization: Bearer $TOKEN" | grep -q "$EMAIL" \
  && pass "Authenticated /auth/me" || fail "Authenticated /auth/me"

curl -fsS "$API/wzcs" -H "Authorization: Bearer $TOKEN" >/dev/null \
  && pass "Authenticated GET /wzcs" || fail "Authenticated GET /wzcs"

CORS=$(curl -fsS -o /dev/null -D - -X OPTIONS "$API/wzcs" \
  -H "Origin: $ADMIN" -H 'Access-Control-Request-Method: GET' | grep -i '^access-control-allow-origin' || true)
echo "$CORS" | grep -q "$ADMIN" && pass "CORS allows admin origin" || fail "CORS allows admin origin"

echo "All checks passed."
