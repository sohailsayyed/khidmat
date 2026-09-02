# Deploying Khidmat on a server with Docker

This covers building and running the image directly on your server (no Docker Hub, no registry — you
build it there manually), with the database and uploaded images on a **persistent volume** — so if the
container crashes, gets killed, or you rebuild/redeploy, nothing is lost. Docker also restarts it
automatically. A [Caddy](https://caddyserver.com/) reverse proxy is included by default so the site is
reachable on plain port 80 (no `:3000`), ready to switch on free automatic HTTPS the moment you point a
domain at it.

## How the persistence works

Everything that needs to survive is under one path inside the container: `/app/data`. It holds:

- `/app/data/khidmat.db` — the SQLite database (donations, expenses, causes, site content, everything)
- `/app/data/uploads/` — every image uploaded from the admin panel

That path is mounted to a **named Docker volume**, which lives independently of the container. If the
container crashes, is removed, or you rebuild the image with new code, the volume is untouched — the next
container just mounts the same volume and picks up exactly where it left off. The only way to lose this
data is to explicitly delete the volume itself.

Combined with `restart: unless-stopped` and a Docker health check (the container reports "unhealthy" if
the app stops responding, not just if the process exits), Docker will detect and restart a crashed or
hung container on its own.

## 1. Prerequisites

On the server:

```bash
# Docker Engine + Compose plugin (Ubuntu/Debian example)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
docker compose version          # should print a version, confirms the plugin is installed
```

## 2. Get the code onto the server

```bash
git clone https://github.com/sohailsayyed/khidmat.git
cd khidmat
```

(Or `scp`/`rsync` the project folder over instead of using git — either way, you need the full source,
since the image is built here, not pulled from a registry.)

## Quick start: two scripts

Steps 3–5 below are automated by `docker-setup.sh` — run once, first time only:

```bash
./docker-setup.sh
```

It creates `.env.docker` (prompting you to fill in real values), builds the image, starts it, waits for
it to report healthy, and creates the admin account. If a build fails because of an older `buildx` plugin
(see Troubleshooting), it automatically retries with the classic builder.

**Every time after that, whenever you change code**, just run:

```bash
./docker-deploy.sh
```

It pulls the latest code (if this is a git checkout), rebuilds, and recreates the container — the
database and uploaded images are untouched, since they live on the volume, not in the container. Also
retries with the classic builder automatically if needed.

Both scripts are safe to re-run, and print what they're doing at each step. The rest of this doc explains
what they're doing under the hood, plus what to do for everything else (backups, HTTPS, troubleshooting).
If you'd rather run each step by hand instead of using the scripts, steps 3–5 below show exactly what
`docker-setup.sh` does.

## 3. Create the env file

```bash
cp .env.docker.example .env.docker
```

Then edit `.env.docker`:

```
DATABASE_URL=file:/app/data/khidmat.db
ADMIN_EMAIL=you@yourcharity.org
ADMIN_PASSWORD=a-strong-password-not-the-default
ADMIN_NAME=Khidmat Admin
SESSION_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING
```

Generate a real `SESSION_SECRET`:

```bash
openssl rand -base64 32
```

**Don't skip this file, and it's already git-ignored — never commit it.** `DATABASE_URL` must point
inside `/app/data` (the mounted volume) — if it points anywhere else, the database won't survive a
restart. `.env.docker` is separate from the plain `.env` file used by `npm run dev`, on purpose — the two
need different `DATABASE_URL` values (Docker's volume path vs. a local file), so they can't share one file.

## 4. Build and start it

```bash
docker compose build
docker compose up -d
docker compose ps          # should show "healthy" after ~20s
docker compose logs -f     # watch startup; Ctrl+C to stop following
```

On startup the container automatically runs `prisma migrate deploy`, so the database schema is always
up to date — no manual migration step needed, on first run or any later update.

## 5. First-time only: create the admin login

```bash
docker compose exec khidmat npm run db:seed
```

This creates the admin account from the `.env.docker` values above. It's safe to run again later — it
only creates the account if it doesn't already exist, it won't reset your password.

Visit `http://your-server-ip` (plain port 80, no `:3000` needed — see "Ports and the reverse proxy"
below) for the site, `/admin/login` for the admin panel.

## 6. Verify the crash-recovery actually works

Worth doing once so you trust it. Note two different things here:

**A container you stop yourself does *not* auto-restart — by design.** `docker compose stop` or
`docker kill` counts as a deliberate stop, and `unless-stopped` intentionally respects that (so you can
take the app down for maintenance without it fighting you). Bringing it back up is just:

```bash
docker compose start
```

**A container that actually crashes (the app process itself dies) does auto-restart.** That's the case
`unless-stopped` is really for — this is the one worth testing:

```bash
# Log in to the admin panel and add/note something (e.g. a donation), then simulate the app crashing:
docker compose exec khidmat sh -c 'kill -9 1'
sleep 5
docker compose ps       # shows "healthy" again — Docker restarted it on its own
```

Reload the site — everything you added is still there, because it lived on the volume, not inside the
container process that just died.

## 7. Deploying updates (new code)

```bash
./docker-deploy.sh
```

Or by hand, if you'd rather not use the script:

```bash
git pull
docker compose build
docker compose up -d
```

The volume is untouched by this — your data carries over. `docker compose up -d` only recreates the
container if the image actually changed, so this is safe to run any time.

## 8. Back up the volume itself (in addition to the in-app Backup & Restore)

The admin panel's **Backup & Restore** page exports your data as a JSON file — use it regularly, and
especially before any risky change. That protects against *application-level* mistakes (bad edits, a bad
import). It does **not** protect against the server's disk failing entirely, since the volume lives on
that same disk. For that, back up the volume itself somewhere else periodically:

```bash
docker run --rm \
  -v khidmat_khidmat_data:/data \
  -v "$(pwd)":/backup \
  busybox tar czf /backup/khidmat-data-$(date +%F).tar.gz -C / data
```

(Volume name may differ — check with `docker volume ls`; Compose usually prefixes it with the project
folder name, e.g. `khidmat_khidmat_data`.) Copy that `.tar.gz` off the server (another machine, cloud
storage, etc.) — a backup that lives on the same disk it's backing up doesn't help if that disk dies.

To restore it onto a fresh volume:

```bash
docker run --rm \
  -v khidmat_khidmat_data:/data \
  -v "$(pwd)":/backup \
  busybox tar xzf /backup/khidmat-data-2026-09-01.tar.gz -C /
```

## 9. Ports and the reverse proxy

`docker-compose.yml` already includes a [Caddy](https://caddyserver.com/) reverse proxy in front of the
app, so you never need to type `:3000` — Caddy listens on the standard ports (80, and 443 once you add a
domain) and forwards to the app over Caddy's own internal Docker network. The app container itself
doesn't publish port 3000 to the host at all (`docker ps` won't show a `3000->3000` mapping) — the only
way in is through Caddy. `Caddyfile` controls what Caddy does.

Right now `Caddyfile` is set to plain HTTP on any hostname (`:80`), because you're using a bare IP —
Let's Encrypt can't issue a certificate for an IP address, only for a real domain name, so automatic HTTPS
isn't possible yet.

**When you get a domain**, point its DNS A record at the server's IP, then edit `Caddyfile`:

```
yourdomain.org {
    reverse_proxy khidmat:3000
}
```

Then:

```bash
docker compose up -d
```

That's it — Caddy detects the domain, automatically requests and renews a free HTTPS certificate, and
starts redirecting HTTP to HTTPS. No other files need to change, and no restart of the `khidmat` service
is needed (only `caddy` picks up the new config).

**Firewall reminder**: make sure ports 80 and 443 are open on the server (not 3000 — that's internal-only
now). If you're on a cloud provider (AWS/DigitalOcean/etc.), that usually means opening them in the
provider's security group/firewall panel too, not just `ufw`/`iptables` on the box itself.

## Troubleshooting

- **`docker compose build` fails with "client version X.XX is too old" or "compose build requires buildx
  X.XX or later"**: the server's `docker-buildx` plugin is older than the Docker Engine expects (common on
  systems where Docker Engine was updated but the buildx plugin wasn't). Fastest fix — fall back to the
  classic builder for the build step:
  ```bash
  DOCKER_BUILDKIT=0 docker compose build
  docker compose up -d
  ```
  Longer-term fix is updating the buildx plugin, but the above is fine indefinitely.
- **Container keeps restarting / unhealthy**: `docker compose logs khidmat` — almost always a missing or
  wrong environment variable (`DATABASE_URL` not pointing into `/app/data` is the most common one), or a
  missing `.env.docker` file.
- **Shell into the running container**: `docker compose exec khidmat sh`
- **Check the volume is actually being used**: `docker compose exec khidmat ls -la /app/data`
- **Rebuild from scratch** (e.g. suspect a stale layer): `docker compose build --no-cache`
- **Disk filling up**: `docker system df` — old images/build cache pile up over time; `docker image
  prune` and `docker builder prune` clear unused ones (never prunes volumes, so this is safe to run
  regularly).
