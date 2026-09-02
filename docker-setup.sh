#!/bin/bash
# One-time initial setup: create .env.docker, build the image, start it,
# and seed the first admin account. Run again later only if you delete the
# container/volume and are starting fresh — for normal code updates use
# ./docker-deploy.sh instead.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Khidmat: initial Docker setup"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install it first: https://get.docker.com" >&2
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
    exit 1
  fi
fi
echo "Using: $COMPOSE"

if [ ! -f .env.docker ]; then
  if [ ! -f .env.docker.example ]; then
    echo ".env.docker.example not found — run this from the project root." >&2
    exit 1
  fi
  cp .env.docker.example .env.docker

  SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  sed -i.bak "s#^SESSION_SECRET=.*#SESSION_SECRET=${SECRET}#" .env.docker && rm -f .env.docker.bak

  echo ""
  echo "Created .env.docker with a generated SESSION_SECRET."
  echo "IMPORTANT: edit .env.docker now and set a real ADMIN_EMAIL / ADMIN_PASSWORD"
  echo "(the defaults match this repo's public example file)."
  echo ""
  if [ -t 0 ]; then
    read -rp "Press Enter once you've edited .env.docker (or Ctrl+C to stop and edit first): "
  else
    echo "Non-interactive shell — continuing in 5s. Edit .env.docker now if you need to, or Ctrl+C."
    sleep 5
  fi
else
  echo ".env.docker already exists — leaving it as-is."
fi

if grep -q '^ADMIN_PASSWORD=ChangeMe123!$' .env.docker 2>/dev/null; then
  echo "WARNING: .env.docker still has the default ADMIN_PASSWORD. Change it before going live." >&2
fi

echo "==> Building image..."
if ! $COMPOSE build; then
  echo "Build failed — retrying with the classic builder (older buildx plugin?)..."
  DOCKER_BUILDKIT=0 $COMPOSE build
fi

echo "==> Starting..."
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
  echo "Container did not become healthy in time. Check logs: $COMPOSE logs khidmat" >&2
  exit 1
fi
echo "Container is healthy."

echo "==> Creating admin account (skipped if it already exists)..."
$COMPOSE exec -T khidmat npm run db:seed

echo ""
echo "==> Setup complete."
echo "    Site:  http://your-server-ip (port 80, via Caddy — no :3000 needed)"
echo "    Admin: /admin/login — credentials are in .env.docker"
echo ""
echo "For future code changes, run ./docker-deploy.sh instead of this script."
