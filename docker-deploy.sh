#!/bin/bash
# Run this after making code changes: pulls the latest code (if this is a
# git checkout), rebuilds the image, and recreates the container. The
# database and uploaded images are untouched — they live on the
# khidmat_data volume, not in the container. For first-time setup use
# ./docker-setup.sh instead.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Khidmat: deploying latest code"

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
    exit 1
  fi
fi

if [ ! -f .env.docker ]; then
  echo ".env.docker not found — run ./docker-setup.sh first." >&2
  exit 1
fi

if [ -d .git ]; then
  echo "==> Pulling latest code..."
  git pull
else
  echo "Not a git checkout — skipping git pull. Make sure the updated source is already in place."
fi

echo "==> Rebuilding image..."
if ! $COMPOSE build; then
  echo "Build failed — retrying with the classic builder (older buildx plugin?)..."
  DOCKER_BUILDKIT=0 $COMPOSE build
fi

echo "==> Recreating container..."
$COMPOSE up -d

echo "==> Waiting for the container to become healthy..."
healthy=false
for i in $(seq 1 30); do
  cid=$($COMPOSE ps -q khidmat 2>/dev/null || true)
  if [ -n "$cid" ]; then
    status=$(docker inspect --format='{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "")
    if [ "$status" = "healthy" ]; then
      healthy=true
      break
    fi
  fi
  sleep 2
done

if [ "$healthy" != "true" ]; then
  echo "Container did not become healthy after deploy. Check logs: $COMPOSE logs khidmat" >&2
  exit 1
fi

echo "==> Deployed successfully — container is healthy. Data on the volume was untouched."
