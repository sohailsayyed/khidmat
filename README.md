# Khidmat

Charity website built with Next.js, Prisma, and SQLite.

## What's here

- **Public site** (`/`) — hero, about, causes, gallery, testimonials, contact, and a **Donate Now** button that opens a modal with the contact number, WhatsApp link, and donation QR code. Visitors can optionally leave their name/amount so the donation gets logged as a pending record.
- **Admin panel** (`/admin`) — manage all site content and images (hero/about text, logo, QR code, contact details, social links), causes, gallery photos, and testimonials.
- **Donation tracking** (`/admin/donations`) — every website donation intent is recorded automatically (status `PENDING`); admins can also add manual/offline donations (cash, bank transfer, etc.), edit any record, mark them Confirmed/Pending/Cancelled, filter by day/month/year, search, and import/export CSV.
- **Amount Spent** (`/admin/expenses`) — track what the collected donations have been spent on (purpose, amount, date, note). Shows Total Donations, Total Spent, and the resulting Available Balance; same day/month/year filter, search, and CSV import/export as Donations.
- **Users & roles** (`/admin/users`, admin-only) — more than one person can have a login. Each account is either:
  - **Admin** — full access, including managing other users.
  - **Viewer** — can see every admin page and record, but can't add, edit, delete, or import anything. Enforced on the server (not just hidden buttons), and takes effect on an already-logged-in account's *very next request* — no need to log out and back in for a role change to apply.
  - Every manually-added or imported donation/expense records **who added it** (shown as "Added by" in both tables), for accountability.
- **Backup & Restore** (`/admin/backup`, admin-only) — download the entire site's data (content, causes, gallery, testimonials, donations, expenses) as one JSON file, and restore from it later. Restoring fully replaces current data with the file's contents — back up first if unsure.
- **Account** (`/admin/account`) — any signed-in user (including Viewers) can change their own password.

## Getting started

```bash
npm install
npx prisma migrate dev   # creates the SQLite database
npm run db:seed          # creates the first admin account + default content
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site, and [http://localhost:3000/admin](http://localhost:3000/admin/login) for the admin panel.

## Admin login

The seed script creates one admin account from these `.env` values (defaults shown — **change them**):

```
ADMIN_EMAIL="admin@khidmat.org"
ADMIN_PASSWORD="ChangeMe123!"
```

Also set `SESSION_SECRET` in `.env` to a long random string before deploying — it signs the admin session cookie. Once logged in, that first account can create more accounts (Admin or Viewer) from `/admin/users`, and everyone can change their own password from `/admin/account`.

## Deploying on a server with Docker

See **[DOCKER-SETUP.md](DOCKER-SETUP.md)** for the full walkthrough — building the image directly on your
own server (no Docker Hub), a persistent volume so data survives crashes/redeploys, a bundled Caddy reverse
proxy so the site is reachable on plain port 80 (with automatic HTTPS once you add a domain), and two
helper scripts:

```bash
./docker-setup.sh    # first time only: builds, starts, seeds the admin account
./docker-deploy.sh   # every time after that, when you've changed code: pulls, rebuilds, redeploys
```

## Deploying on Vercel

See **[VERCEL-SETUP.md](VERCEL-SETUP.md)** — a real, persistent deployment using a Postgres database and
Vercel Blob for uploaded images (not the local SQLite file this app uses everywhere else, which doesn't
survive Vercel's read-only, ephemeral filesystem). Uses a second, parallel Prisma schema
(`prisma/postgres/`) just for this — your local dev setup and the Docker deployment above are completely
untouched by it.

## Notes

- Images uploaded from the admin panel are served through `/api/uploads/[...path]` (see `src/lib/upload.ts`
  and `src/app/api/uploads/[...path]/route.ts`), not directly from Next's `public/` static handler — `next
  start` does not reliably serve files added to `public/` after the server has started, which would
  otherwise make uploads silently 404 in production. Where new uploads actually get *stored*: local disk by
  default (configurable via `UPLOADS_DIR` — the Docker image sets it to `/app/data/uploads`, on the
  persistent volume), or Vercel Blob automatically when `BLOB_READ_WRITE_TOKEN` is set (see
  VERCEL-SETUP.md) — local disk doesn't persist on Vercel's serverless filesystem.
- The donation flow doesn't process payments online — donors pay via the QR code or by calling/messaging the number shown, and staff confirm the donation from the admin panel. This matches a manual/offline collection process; a payment gateway (Razorpay, Stripe, etc.) can be added later if online payments are needed.
- Database: SQLite file at `prisma/dev.db` locally (gitignored). In production, `DATABASE_URL` should point at a file on persistent storage (or a hosted database) — migrations apply automatically on startup (`npm run start` runs `prisma migrate deploy` first).
- Backup & Restore covers the database only, not the uploaded image files themselves — see DOCKER-SETUP.md for backing up the Docker volume (which holds both) if you need the photos preserved too.
