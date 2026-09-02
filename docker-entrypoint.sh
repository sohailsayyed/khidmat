#!/bin/sh
set -e

# Everything that needs to survive a restart/redeploy lives under one path
# (/app/data), so a single mounted disk covers both the SQLite database and
# uploaded images — this matters on hosts like Render that only support one
# persistent disk per service. UPLOADS_DIR (set in the Dockerfile) points
# uploads at $DATA_DIR/uploads; images are served via the /api/uploads route,
# not Next's public/ static handler (which doesn't pick up files written
# after the server has started).
DATA_DIR="/app/data"
UPLOADS_DIR="$DATA_DIR/uploads"

mkdir -p "$UPLOADS_DIR"

# First boot against a fresh disk: seed it with the sample/placeholder images
# baked into the image, so there's something to look at before any real
# uploads happen.
if [ -d "public/uploads" ] && [ -z "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  cp -a public/uploads/. "$UPLOADS_DIR/" 2>/dev/null || true
fi

npx prisma migrate deploy
exec npx next start
