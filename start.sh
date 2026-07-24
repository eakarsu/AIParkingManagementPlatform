#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$PROJECT_DIR/client"
cd "$PROJECT_DIR"

[[ -f .env ]] || { echo 'Copy .env.example to .env and configure it' >&2; exit 1; }
set -a
source ./.env
set +a

BACKEND_PORT="${SERVER_PORT:-${BACKEND_PORT:-3001}}"
FRONTEND_PORT="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
[[ "${#JWT_SECRET}" -ge 32 ]] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
[[ "${GOVERNANCE_TENANT_ID:-}" =~ ^[A-Za-z0-9._:-]{3,128}$ ]] || { echo 'GOVERNANCE_TENANT_ID is required' >&2; exit 1; }
[[ "${DATABASE_URL:-}" == postgresql://* || "${DATABASE_URL:-}" == postgres://* ]] || { echo 'DATABASE_URL must be a PostgreSQL URL' >&2; exit 1; }
[[ -d "$PROJECT_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] || { echo 'Dependencies are missing; install them explicitly in project root and client' >&2; exit 1; }

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is occupied; refusing to terminate another process." >&2
    exit 1
  fi
done

if [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == true ]]; then node server/scripts/prepareRuntime.js; fi

(SERVER_PORT="$BACKEND_PORT" node server/index.js) & api_pid=$!
(cd "$UI_DIR" && PORT="$FRONTEND_PORT" BROWSER=none CI=true REACT_APP_API_BASE="http://127.0.0.1:$BACKEND_PORT/api" npm start) & ui_pid=$!
cleanup(){ kill "$api_pid" "$ui_pid" 2>/dev/null || true; wait "$api_pid" "$ui_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$api_pid" "$ui_pid"
