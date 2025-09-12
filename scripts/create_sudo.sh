#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
${SCRIPT_NAME} - Create/upgrade a SUDO admin (root) for the app.

This script asks for email / password / name and runs the internal creator.

Usage:
  ${SCRIPT_NAME}

Notes:
- Prefer running inside the repo root. If using Docker, the script will run
  the command inside the 'backend' service container automatically.
- If Docker isn't available, it will try a local run using PYTHONPATH.
EOF
}

ask() {
  local prompt="$1"; local varname="$2"; local def="${3:-}"
  local input
  read -rp "$prompt" input || true
  if [[ -z "$input" && -n "$def" ]]; then input="$def"; fi
  printf -v "$varname" '%s' "$input"
}

ask_secret() {
  local prompt="$1"; local varname="$2"
  local input
  read -rsp "$prompt" input || true
  echo
  printf -v "$varname" '%s' "$input"
}

main() {
  echo "— Create SUDO Admin —"
  local email password name
  ask "Email (e.g. admin@example.com): " email "admin@example.com"
  ask_secret "Password: " password
  ask "Name [Sudo Admin]: " name "Sudo Admin"

  if [[ -z "$email" || -z "$password" ]]; then
    echo "[!] Email and Password are required." >&2
    exit 1
  fi

  # Prefer Docker Compose if available and backend service exists
  if command -v docker >/dev/null 2>&1 && (docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1); then
    cd "$ROOT_DIR"
    # Choose compose command
    if docker compose version >/dev/null 2>&1; then
      COMPOSE=(docker compose)
    else
      COMPOSE=(docker-compose)
    fi
    # Choose compose file (generated has priority if present)
    if [[ -f docker-compose.generated.yml ]]; then
      COMPOSE+=( -f docker-compose.generated.yml )
    else
      COMPOSE+=( -f docker-compose.yml )
    fi
    # Ensure backend is up, otherwise try to run anyway
    BE_CID=$("${COMPOSE[@]}" ps -q backend || true)
    if [[ -z "$BE_CID" ]]; then
      echo "[i] Backend not running. Starting DB and running command transiently..."
      "${COMPOSE[@]}" up -d postgres >/dev/null 2>&1 || true
      "${COMPOSE[@]}" run --rm backend sh -lc "python -m alembic -c app/../alembic.ini upgrade head && python -m app.scripts.create_admin --email '$email' --password '$password' --name '$name'"
    else
      echo "[i] Creating/updating SUDO admin inside backend container..."
      "${COMPOSE[@]}" exec backend python -m app.scripts.create_admin --email "$email" --password "$password" --name "$name"
    fi
    exit 0
  fi

  # Fallback: local run via PYTHONPATH (requires DB connectivity from host)
  echo "[i] Docker not available. Trying local run..."
  cd "$ROOT_DIR/backend"
  PYTHONPATH=. python3 -m app.scripts.create_admin --email "$email" --password "$password" --name "$name"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage; exit 0
fi

main "$@"

