#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE_DEFAULT="$ROOT_DIR/docker-compose.yml"
COMPOSE_GEN="$ROOT_DIR/docker-compose.generated.yml"
PROJECT_NAME="marzban-admin"

log() { printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { echo "Error: $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -p "$PROJECT_NAME" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -p "$PROJECT_NAME" "$@"
  else
    fail "docker compose or docker-compose not found"
  fi
}

main() {
  require_cmd docker

  local compose_file="$COMPOSE_DEFAULT"
  if [[ -f "$COMPOSE_GEN" ]]; then
    compose_file="$COMPOSE_GEN"
  fi

  log "Starting stack using: $compose_file"
  compose -f "$compose_file" up -d

  log "Following logs. Ctrl+C to stop viewing logs (services stay running)."
  compose -f "$compose_file" logs -f
}

main "$@"

