#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Prefer aligning with prior scripts but also handle default compose project name
PROJECT_NAME="marzban-admin"
PROJECT_CANDIDATES=("$PROJECT_NAME" "$(basename "$ROOT_DIR")")

COMPOSE_DEFAULT="$ROOT_DIR/docker-compose.yml"
COMPOSE_GEN="$ROOT_DIR/docker-compose.generated.yml"

log() { printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { echo "Error: $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

compose_v2() { docker compose "$@"; }
compose_v1() { docker-compose "$@"; }
compose() {
  if docker compose version >/dev/null 2>&1; then
    compose_v2 "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    compose_v1 "$@"
  else
    fail "docker compose or docker-compose not found"
  fi
}

pick_compose_file() {
  if [[ -f "$COMPOSE_GEN" ]]; then
    echo "$COMPOSE_GEN"
  else
    echo "$COMPOSE_DEFAULT"
  fi
}

down_all_projects() {
  local compose_file="$1"
  # Down with default project name (directory-based)
  log "Stopping stack (default project) using: $compose_file"
  compose -f "$compose_file" down --remove-orphans --rmi local || true
  # Down with explicit project name used by older scripts
  for pname in "${PROJECT_CANDIDATES[@]}"; do
    log "Stopping stack (project=$pname) using: $compose_file"
    compose -p "$pname" -f "$compose_file" down --remove-orphans --rmi local || true
  done
}

remove_non_db_volumes() {
  # Preserve only pgdata volume(s); remove redisdata, backend-data, dbbackups
  local to_remove=("redisdata" "backend-data" "dbbackups")
  for pname in "${PROJECT_CANDIDATES[@]}"; do
    for v in "${to_remove[@]}"; do
      local full_name="${pname}_${v}"
      if docker volume inspect "$full_name" >/dev/null 2>&1; then
        log "Removing volume: $full_name"
        docker volume rm -f "$full_name" || true
      fi
    done
  done
}

build_and_up() {
  local compose_file="$1"
  log "Building images (cached)"
  # Enable BuildKit and parallel builds for speed
  COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 compose -f "$compose_file" build --parallel
  log "Starting services"
  compose -f "$compose_file" up -d
}

run_migrations() {
  local compose_file="$1"
  log "Running DB migrations"
  # Give backend a moment to boot dependencies
  sleep 2
  compose -f "$compose_file" exec -T backend python -m alembic -c alembic.ini upgrade head || true
}

main() {
  require_cmd docker
  local compose_file; compose_file="$(pick_compose_file)"
  log "Compose file: $compose_file"

  down_all_projects "$compose_file"
  remove_non_db_volumes
  build_and_up "$compose_file"
  run_migrations "$compose_file"

  log "Reinstall complete. Database volume(s) preserved."
}

main "$@"

