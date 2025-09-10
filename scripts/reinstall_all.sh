#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE_FILE_PATH="${ROOT_DIR}/docker-compose.yml"

# Defaults (overridable via flags)
PROJECT_NAME="marzban"
NPM_REGISTRY="https://registry.npmjs.org/"
NO_CACHE="true"
PULL_LATEST="true"
BUILD_ONLY="false"
WAIT_TIMEOUT="120"
WIPE_VOLUMES="false"

usage() {
  cat <<EOF
${SCRIPT_NAME} - Reinstall (clean, rebuild, and start) the entire project via docker compose.

Usage:
  ${SCRIPT_NAME} [--project NAME] [--registry URL] [--no-cache=false] [--pull=false] [--build-only] [--timeout SEC] [--wipe-volumes]

Options:
  --project NAME  Compose project name (default: ${PROJECT_NAME})
  --registry URL  npm registry to use for frontend build (default: ${NPM_REGISTRY})
  --no-cache BOOL Build without cache (default: ${NO_CACHE})
  --pull BOOL     Always attempt to pull base images (default: ${PULL_LATEST})
  --build-only    Only build images, do not start containers
  --timeout SEC   Wait timeout for health checks (default: ${WAIT_TIMEOUT})
  --wipe-volumes  Also remove named volumes (data wipe). Default: preserve data
  -h, --help      Show this help and exit
EOF
}

log() {
  printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE_PATH" -p "$PROJECT_NAME" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE_PATH" -p "$PROJECT_NAME" "$@"
  else
    fail "docker compose or docker-compose not found"
  fi
}

wait_for_health() {
  local service="$1"; shift
  local timeout_sec="${1:-$WAIT_TIMEOUT}"
  local start_ts="$(date +%s)"
  local cid
  cid="$(compose ps -q "$service" || true)"
  [[ -n "$cid" ]] || return 0
  if ! docker inspect "$cid" | grep -q '"Health"'; then
    return 0
  fi
  log "Waiting for service '$service' to be healthy (timeout: ${timeout_sec}s)"
  while true; do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$cid" 2>/dev/null || echo unknown)"
    if [[ "$status" == "healthy" ]]; then
      log "Service '$service' is healthy"
      return 0
    fi
    if (( $(date +%s) - start_ts > timeout_sec )); then
      docker logs --tail 200 "$cid" || true
      fail "Service '$service' did not become healthy in ${timeout_sec}s (status: $status)"
    fi
    sleep 2
  done
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
    --project)
      shift; PROJECT_NAME="${1:-}"; [[ -n "$PROJECT_NAME" ]] || fail "--project requires a value" ;;
    --registry)
      shift; NPM_REGISTRY="${1:-}"; [[ -n "$NPM_REGISTRY" ]] || fail "--registry requires a value" ;;
    --no-cache)
      shift; NO_CACHE="${1:-true}" ;;
    --pull)
      shift; PULL_LATEST="${1:-true}" ;;
    --build-only)
      BUILD_ONLY="true" ;;
    --timeout)
      shift; WAIT_TIMEOUT="${1:-120}" ;;
    --wipe-volumes)
      WIPE_VOLUMES="true" ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      fail "Unknown argument: $1" ;;
  esac
  shift
done

# Preconditions
require_cmd docker
require_cmd curl
[[ -f "$COMPOSE_FILE_PATH" ]] || fail "Compose file not found: $COMPOSE_FILE_PATH"

log "Bringing down existing stack (preserving volumes by default)"
if [[ "$WIPE_VOLUMES" == "true" ]]; then
  compose down -v --remove-orphans || true
else
  compose down --remove-orphans || true
fi

log "Pruning builder cache and dangling images (safe)"
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -af >/dev/null 2>&1 || true

log "Building all services (no-cache=${NO_CACHE}, pull=${PULL_LATEST})"
BUILD_FLAGS=()
[[ "$NO_CACHE" == "true" ]] && BUILD_FLAGS+=("--no-cache")
[[ "$PULL_LATEST" == "true" ]] && BUILD_FLAGS+=("--pull")
BUILD_FLAGS+=("--build-arg" "NPM_REGISTRY=${NPM_REGISTRY}")
compose build "${BUILD_FLAGS[@]}"

if [[ "$BUILD_ONLY" == "true" ]]; then
  log "Build-only mode. Skipping 'up'."
  exit 0
fi

log "Starting stack in detached mode"
compose up -d

# Health waits (best-effort)
wait_for_health postgres "$WAIT_TIMEOUT" || true

# Basic HTTP checks if services exist
if compose ps -q backend >/dev/null 2>&1 && [[ -n "$(compose ps -q backend)" ]]; then
  wait_for_http "http://localhost:8000/docs" "$WAIT_TIMEOUT" || true
fi
if compose ps -q frontend >/dev/null 2>&1 && [[ -n "$(compose ps -q frontend)" ]]; then
  wait_for_http "http://localhost:3000" "$WAIT_TIMEOUT" || true
fi
if compose ps -q nginx >/dev/null 2>&1 && [[ -n "$(compose ps -q nginx)" ]]; then
  wait_for_http "http://localhost" "$WAIT_TIMEOUT" || true
fi

log "Project is up. Use 'docker compose -f ${COMPOSE_FILE_PATH} -p ${PROJECT_NAME} ps' to see status."
exit 0

