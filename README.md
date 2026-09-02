# Khidmat

Charity website built with Next.js, Prisma, and SQLite.

## What's here

- **Public site** (`/`) — hero, about, causes, gallery, testimonials, contact, and a **Donate Now** button that opens a modal with the contact number, WhatsApp link, and donation QR code. Visitors can optionally leave their name/amount so the donation gets logged as a pending record.
- **Admin panel** (`/admin`) — manage all site content and images (hero/about text, logo, QR code, contact details, social links), causes, gallery photos, and testimonials.
- **Donation tracking** (`/admin/donations`) — every website donation intent is recorded automatically (status `PENDING`); admins can also add manual/offline donations (cash, bank transfer, etc.), mark records Confirmed/Pending/Cancelled, search/filter, and export to CSV.

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

Also set `SESSION_SECRET` in `.env` to a long random string before deploying — it signs the admin session cookie.

## Docker

```bash
docker compose up        # builds the image and runs it at http://localhost:3000
docker exec -it khidmat-khidmat-1 npm run db:seed   # first time only, creates the admin account
```

See [Dockerfile](Dockerfile) and [docker-compose.yml](docker-compose.yml). The database and uploaded
images both live under one mounted volume (`/app/data`) so they survive restarts/redeploys — don't run
the image without that volume attached, or a redeploy wipes all data. To build and push your own image:

```bash
docker build -t <your-dockerhub-username>/khidmat:latest .
docker push <your-dockerhub-username>/khidmat:latest
```

## Notes

- Images uploaded from the admin panel are served through `/api/uploads/[...path]` (see `src/lib/upload.ts`
  and `src/app/api/uploads/[...path]/route.ts`), not directly from Next's `public/` static handler — `next
  start` does not reliably serve files added to `public/` after the server has started, which would
  otherwise make uploads silently 404 in production. Where the files are actually *stored* is configurable
  via the `UPLOADS_DIR` env var (defaults to `public/uploads` for local dev; the Docker image sets it to
  `/app/data/uploads`, on the persistent volume). On a serverless host (e.g. Vercel) this local-disk storage
  does not persist across deploys either way — swap in an object storage provider (S3, Cloudflare R2, etc.)
  for that kind of host. It works as-is on Docker or any regular Node.js server/VM with persistent disk.
- The donation flow doesn't process payments online — donors pay via the QR code or by calling/messaging the number shown, and staff confirm the donation from the admin panel. This matches a manual/offline collection process; a payment gateway (Razorpay, Stripe, etc.) can be added later if online payments are needed.
- Database: SQLite file at `prisma/dev.db` locally (gitignored). In production, `DATABASE_URL` should point at a file on persistent storage (or a hosted database) — migrations apply automatically on startup (`npm run start` runs `prisma migrate deploy` first).
