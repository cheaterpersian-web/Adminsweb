#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE_PATH="${ROOT_DIR}/docker-compose.yml"

# Configurable
PROJECT_NAME="marzban"
NPM_REGISTRY="https://registry.npmjs.org/"
WAIT_TIMEOUT="150"

usage() {
  cat <<EOF
${SCRIPT_NAME} - Hard clean previous containers/images/volumes and reinstall from source.

Usage:
  ${SCRIPT_NAME} [--project NAME] [--registry URL] [--timeout SEC]

Options:
  --project NAME  Compose project name (default: ${PROJECT_NAME})
  --registry URL  npm registry used during frontend build (default: ${NPM_REGISTRY})
  --timeout SEC   Wait timeout for health checks (default: ${WAIT_TIMEOUT})
  -h, --help      Show this help and exit
EOF
}

log() { printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
fail() { echo "Error: $*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE_PATH" -p "$PROJECT_NAME" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE_PATH" -p "$PROJECT_NAME" "$@"
  else
    fail "docker compose or docker-compose not found"
  fi
}

wait_for_http() {
  local url="$1"; shift
  local timeout_sec="${1:-$WAIT_TIMEOUT}"
  local start_ts="$(date +%s)"
  log "Waiting for ${url} (timeout: ${timeout_sec}s)"
  until curl -fsS -m 3 "$url" >/dev/null 2>&1; do
    if (( $(date +%s) - start_ts > timeout_sec )); then
      fail "Endpoint not ready within ${timeout_sec}s: $url"
    fi
    sleep 2
  done
  log "OK: ${url}"
}

trap 'echo "${SCRIPT_NAME}: failed at line ${LINENO}" >&2' ERR

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) shift; PROJECT_NAME="${1:-}"; [[ -n "$PROJECT_NAME" ]] || fail "--project requires a value" ;;
    --registry) shift; NPM_REGISTRY="${1:-}"; [[ -n "$NPM_REGISTRY" ]] || fail "--registry requires a value" ;;
    --timeout) shift; WAIT_TIMEOUT="${1:-150}" ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
  shift
done

# Preconditions
require_cmd docker
require_cmd curl
[[ -f "$COMPOSE_FILE_PATH" ]] || fail "Compose file not found: $COMPOSE_FILE_PATH"

log "Stopping any running stack (remove orphans & volumes)"
compose down -v --remove-orphans || true

log "Killing stray containers with project label (best-effort)"
docker ps -a --filter "label=com.docker.compose.project=${PROJECT_NAME}" -q | xargs -r docker rm -f || true

log "Removing images for this repo (best-effort)"
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | awk '/marzban|frontend|backend|nginx/ { print $2 }' | xargs -r docker rmi -f || true

log "Pruning builder cache and networks (aggressive but safe)"
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -af >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true
docker network prune -f >/dev/null 2>&1 || true

log "Removing named volumes used by compose (data wipe)"
docker volume rm $(docker volume ls -q | grep -E "(pgdata|redisdata|backend-data|dbbackups)" || true) >/dev/null 2>&1 || true

log "Building from fresh source with no cache"
compose build --no-cache --pull --build-arg NPM_REGISTRY="$NPM_REGISTRY"

log "Starting stack"
compose up -d

log "Waiting for core services to respond"
wait_for_http "http://localhost:8000/docs" "$WAIT_TIMEOUT" || true
wait_for_http "http://localhost:3000" "$WAIT_TIMEOUT" || true
wait_for_http "http://localhost" "$WAIT_TIMEOUT" || true

log "Done. Frontend: http://localhost:3000  |  Backend: http://localhost:8000  |  NGINX: http://localhost"
exit 0

