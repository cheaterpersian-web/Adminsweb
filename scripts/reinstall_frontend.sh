#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults (overridable via flags)
IMAGE_NAME="marzban-frontend"
CONTAINER_NAME="marzban-frontend"
EXPOSE_PORT="3000"
NPM_REGISTRY="https://registry.npmjs.org/"
FRONTEND_DIR="${ROOT_DIR}/frontend"
DOCKERFILE_PATH="${FRONTEND_DIR}/Dockerfile"
RUN_CONTAINER="true"

usage() {
  cat <<EOF
${SCRIPT_NAME} - Clean old Docker artifacts and reinstall (build + run) the frontend.

Usage:
  ${SCRIPT_NAME} [--registry URL] [--image NAME] [--container NAME] [--port PORT] [--build-only]

Options:
  --registry URL   Override npm registry for build (default: ${NPM_REGISTRY})
  --image NAME     Docker image name to build (default: ${IMAGE_NAME})
  --container NAME Docker container name to run (default: ${CONTAINER_NAME})
  --port PORT      Host port to map to 3000 (default: ${EXPOSE_PORT})
  --build-only     Only build the image, do not run the container
  -h, --help       Show this help and exit
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

trap 'echo "${SCRIPT_NAME}: failed at line ${LINENO}" >&2' ERR

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --registry)
      shift; NPM_REGISTRY="${1:-}"; [[ -n "$NPM_REGISTRY" ]] || fail "--registry requires a value" ;;
    --image)
      shift; IMAGE_NAME="${1:-}"; [[ -n "$IMAGE_NAME" ]] || fail "--image requires a value" ;;
    --container)
      shift; CONTAINER_NAME="${1:-}"; [[ -n "$CONTAINER_NAME" ]] || fail "--container requires a value" ;;
    --port)
      shift; EXPOSE_PORT="${1:-}"; [[ -n "$EXPOSE_PORT" ]] || fail "--port requires a value" ;;
    --build-only)
      RUN_CONTAINER="false" ;;
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

[[ -f "$DOCKERFILE_PATH" ]] || fail "Dockerfile not found at $DOCKERFILE_PATH"

log "Stopping and removing any existing container: ${CONTAINER_NAME}"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

log "Removing existing image if present: ${IMAGE_NAME}:latest"
docker image rm -f "${IMAGE_NAME}:latest" >/dev/null 2>&1 || true

log "Pruning builder cache (safe)"
docker builder prune -af >/dev/null 2>&1 || true

log "Building frontend image ${IMAGE_NAME}:latest from ${FRONTEND_DIR}"
docker build \
  --file "$DOCKERFILE_PATH" \
  --no-cache \
  --pull \
  --network host \
  --build-arg NPM_REGISTRY="$NPM_REGISTRY" \
  --tag "${IMAGE_NAME}:latest" \
  "$FRONTEND_DIR" \
  | cat

if [[ "$RUN_CONTAINER" != "true" ]]; then
  log "Build completed (build-only). Skipping run."
  exit 0
fi

log "Running container ${CONTAINER_NAME} on port ${EXPOSE_PORT} -> 3000"
docker run -d --name "$CONTAINER_NAME" -p "${EXPOSE_PORT}:3000" -e NODE_ENV=production "${IMAGE_NAME}:latest" >/dev/null

log "Waiting for app to become healthy at http://localhost:${EXPOSE_PORT}"
attempt=0
until curl -fsS -m 3 "http://localhost:${EXPOSE_PORT}" >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [[ $attempt -gt 60 ]]; then
    echo "\n--- Last container logs ---"
    docker logs --tail 200 "$CONTAINER_NAME" || true
    fail "App did not become ready within 60s"
  fi
  sleep 1
done

log "Frontend is up: http://localhost:${EXPOSE_PORT}"
exit 0

