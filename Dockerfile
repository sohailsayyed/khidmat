# syntax=docker/dockerfile:1

# ---- deps: install dependencies (cached separately so code edits don't reinstall) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: generate the Prisma client and build the Next.js app ----
FROM deps AS builder
WORKDIR /app
COPY . .
# prisma generate only needs the schema, not a reachable database — this
# placeholder satisfies the config loader at build time.
ENV DATABASE_URL="file:./build-placeholder.db"
RUN npm run build

# ---- runner: minimal image that actually serves the app ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOADS_DIR=/app/data/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Single mount path for everything that needs to survive a restart/redeploy:
# the SQLite database and uploaded images (UPLOADS_DIR above). One disk, one
# mount path — works on hosts that only support a single persistent disk per
# service (e.g. Render).
VOLUME ["/app/data"]

EXPOSE 3000

# Lets Docker (and `docker compose ps`) detect a hung/unresponsive process,
# not just a fully exited one, so restart: unless-stopped can recover it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
