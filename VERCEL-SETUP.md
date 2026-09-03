# Deploying Khidmat on Vercel (with real, persistent data)

This is the **real** Vercel setup — a proper Postgres database and Vercel Blob for uploaded images, so
nothing resets between deploys or cold starts. It uses a separate Postgres-flavored Prisma schema
(`prisma/postgres/`) just for this — your local dev setup and Docker deployment (`DOCKER-SETUP.md`) are
untouched and keep using SQLite exactly as before.

## 1. Connect a Postgres database

In your Vercel project → **Storage** tab → **Create Database** → Postgres (Vercel's own offering is backed
by Neon). Connecting it automatically adds a `DATABASE_URL` environment variable to your project.

Using Neon, Supabase, or another Postgres provider directly is fine too — add the connection string
yourself as `DATABASE_URL` in Project Settings → Environment Variables. **If that provider uses connection
pooling** (Supabase does by default — a pooled connection string looks like
`...pooler.supabase.com:6543/...`, or has `?pgbouncer=true` in it), you need a **second** variable too:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The pooled connection string. Used for normal app queries — a pool is what lets many concurrent serverless function instances share a small number of real database connections without exhausting the database's connection limit. |
| `DIRECT_URL` | The **direct**, non-pooled connection string (usually the same host/port on `:5432`, no `pooler` in the hostname). Used only by `prisma migrate deploy`, which needs a real Postgres session to take an advisory lock — pooled connections (PgBouncer in transaction mode) don't support that, so migrations hang indefinitely instead of failing if you give it the pooled URL here. |

For Supabase specifically: Project Settings → Database → Connection string has both — "Transaction pooler"
(→ `DATABASE_URL`) and "Direct connection" (→ `DIRECT_URL`). If your provider doesn't pool connections at
all (a plain single Postgres instance), set both variables to the same value.

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

`BLOB_READ_WRITE_TOKEN` comes from step 2 automatically. `DATABASE_URL` (and `DIRECT_URL`, if your provider
pools connections) come from step 1 — automatically if you used Vercel's own Postgres, or set by hand if
you connected Neon/Supabase/another provider directly.

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
npx prisma generate --config prisma/postgres/prisma.config.ts
DATABASE_URL="<paste the DATABASE_URL from Vercel>" \
ADMIN_EMAIL="you@yourcharity.org" \
ADMIN_PASSWORD="a-strong-password" \
npx tsx prisma/seed.ts
```

The `prisma generate` line matters — without it, the seed script uses whatever Prisma Client is already
sitting in `node_modules` locally (the SQLite one, from your normal local dev setup), which can't talk to
Postgres correctly. After seeding, run `npx prisma generate` (no `--config`) again to switch your local
`node_modules` back to the SQLite client for local dev.

This is safe to run again later — it only creates the admin account if it doesn't already exist, and never
touches your data otherwise.

Visit your Vercel URL, then `/admin/login`.

## Keeping the two schemas in sync

If you change the data model (add a field, a new table, etc.), you now have **two** places to update:

1. `prisma/schema.prisma` (SQLite) — as usual: `npx prisma migrate dev --name your_change`
2. `prisma/postgres/schema.prisma` (Postgres) — mirror the same change, then generate a matching migration
   against a real (or local Docker) Postgres instance. The schema requires both `DATABASE_URL` and
   `DIRECT_URL` to be set (see step 1 above) — against a plain, unpooled instance like the throwaway
   container below, they're just the same value:
   ```bash
   docker run -d --name khidmat-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=khidmat -p 5433:5432 postgres:16-alpine
   DATABASE_URL="postgresql://postgres:dev@localhost:5433/khidmat" \
   DIRECT_URL="postgresql://postgres:dev@localhost:5433/khidmat" \
   npx prisma migrate dev --config prisma/postgres/prisma.config.ts --name your_change
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
