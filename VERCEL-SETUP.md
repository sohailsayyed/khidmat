# Deploying Khidmat on Vercel (with real, persistent data)

This is the **real** Vercel setup — a proper Postgres database and Vercel Blob for uploaded images, so
nothing resets between deploys or cold starts. It uses a separate Postgres-flavored Prisma schema
(`prisma/postgres/`) just for this — your local dev setup and Docker deployment (`DOCKER-SETUP.md`) are
untouched and keep using SQLite exactly as before.

## 1. Connect a Postgres database

In your Vercel project → **Storage** tab → **Create Database** → Postgres (Vercel's Postgres offering is
backed by Neon). Connecting it automatically adds a `DATABASE_URL` environment variable to your project —
you don't need to set it by hand.

(Using Neon or another Postgres provider directly instead is fine too — just add `DATABASE_URL` yourself
as an environment variable, in Project Settings → Environment Variables.)

## 2. Connect Blob storage (for uploaded images)

Same **Storage** tab → **Create Database** → Blob. This adds a `BLOB_READ_WRITE_TOKEN` environment
variable automatically. Uploaded images from the admin panel are stored there and get a real, permanent
public URL instead of living on local disk (which doesn't persist on Vercel).

## 3. Set the remaining environment variables

Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | A long random string — `openssl rand -base64 32`. Signs the admin login cookie. |
| `ADMIN_EMAIL` | The email for the first admin account (only used the very first time the database is seeded). |
| `ADMIN_PASSWORD` | The password for that account. Change it from a placeholder. |
| `ADMIN_NAME` | Optional — defaults to "Khidmat Admin". |

`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` come from steps 1–2 — don't set those manually unless you're
using a Postgres/Blob provider outside Vercel's own integration.

## 4. Deploy

Push to the branch Vercel is watching (or trigger a deploy from the dashboard). Vercel automatically runs
the `vercel-build` script instead of the normal `build` script — it applies any pending Postgres migrations
before building, so the database schema is always up to date on every deploy, the same way
`docker-entrypoint.sh` does for the Docker deployment.

## 5. Seed the first admin account (one-time)

Vercel has no shell/exec access to a running deployment the way `docker compose exec` does, so seed the
database from your own machine instead, pointed at the same Postgres database Vercel is using (copy the
`DATABASE_URL` value from Vercel's dashboard):

```bash
DATABASE_URL="<paste the DATABASE_URL from Vercel>" \
ADMIN_EMAIL="you@yourcharity.org" \
ADMIN_PASSWORD="a-strong-password" \
npx tsx prisma/seed.ts
```

This is safe to run again later — it only creates the admin account if it doesn't already exist, and never
touches your data otherwise.

Visit your Vercel URL, then `/admin/login`.

## Keeping the two schemas in sync

If you change the data model (add a field, a new table, etc.), you now have **two** places to update:

1. `prisma/schema.prisma` (SQLite) — as usual: `npx prisma migrate dev --name your_change`
2. `prisma/postgres/schema.prisma` (Postgres) — mirror the same change, then generate a matching migration
   against a real (or local Docker) Postgres instance:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate dev --config prisma/postgres/prisma.config.ts --name your_change
   ```
   A quick way to get a throwaway local Postgres to generate against:
   ```bash
   docker run -d --name khidmat-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=khidmat -p 5433:5432 postgres:16-alpine
   DATABASE_URL="postgresql://postgres:dev@localhost:5433/khidmat" npx prisma migrate dev --config prisma/postgres/prisma.config.ts --name your_change
   docker rm -f khidmat-pg
   ```
   Commit the newly generated file under `prisma/postgres/migrations/` — Vercel applies it automatically
   on the next deploy via `vercel-build`.

Forgetting step 2 doesn't break anything immediately (the running Vercel deployment just won't have the new
column/table until you do it), but do it before code that depends on the new field reaches Vercel.

## What's actually different from the Docker/local setup

- **Database**: Postgres (network-connected, always reachable) instead of a SQLite file on disk — this is
  what makes data actually persistent on Vercel's read-only, ephemeral serverless filesystem.
- **Uploaded images**: Vercel Blob (`@vercel/blob`) instead of local disk — same reason. The pre-existing
  sample/placeholder images (hero, about, causes, gallery) are unaffected — those are committed static
  files served from `public/uploads/`, which Vercel serves fine since they're read-only and already present
  at deploy time; only *new* uploads need Blob.
- **Migrations**: applied at *build time* (`vercel-build`) rather than at container startup — there's no
  long-running process on Vercel to do it the way `docker-entrypoint.sh` does.
