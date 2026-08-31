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

## Notes

- Images uploaded from the admin panel are stored under `public/uploads/`. On a serverless host (e.g. Vercel) this storage does not persist across deploys — swap in an object storage provider (S3, Cloudflare R2, etc.) for production use. It works as-is on any regular Node.js server/VM.
- The donation flow doesn't process payments online — donors pay via the QR code or by calling/messaging the number shown, and staff confirm the donation from the admin panel. This matches a manual/offline collection process; a payment gateway (Razorpay, Stripe, etc.) can be added later if online payments are needed.
- Database: SQLite file at `prisma/dev.db` (gitignored). For production, point `DATABASE_URL` at a hosted database and rerun `prisma migrate deploy`.
