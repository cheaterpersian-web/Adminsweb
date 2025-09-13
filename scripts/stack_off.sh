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

stop_stack() {
  # Down default compose if present
  if [[ -f "$COMPOSE_DEFAULT" ]]; then
    log "Stopping default compose stack"
    compose -f "$COMPOSE_DEFAULT" down --remove-orphans || true
  fi
  # Down generated compose if present
  if [[ -f "$COMPOSE_GEN" ]]; then
    log "Stopping generated compose stack"
    compose -f "$COMPOSE_GEN" down --remove-orphans || true
  fi
}

kill_ports() {
  local ports=(8000 3000 80 443)
  for p in "${ports[@]}"; do
    if command -v fuser >/dev/null 2>&1; then
      fuser -k "${p}/tcp" >/dev/null 2>&1 || true
    elif command -v lsof >/dev/null 2>&1; then
      lsof -ti tcp:"$p" | xargs -r kill -9 || true
    fi
  done
}

kill_named() {
  # best-effort remove containers matching our project
  docker ps -a --format '{{.ID}}\t{{.Names}}' | awk '/marzban-admin/ {print $1}' | xargs -r docker rm -f || true
}

main() {
  require_cmd docker
  stop_stack
  log "Killing lingering containers"
  kill_named
  log "Freeing common ports (8000,3000,80,443)"
  kill_ports
  log "Done. Stack is stopped and ports are free."
}

main "$@"

