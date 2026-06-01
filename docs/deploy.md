# Deploy

Castle ships as a single tarball + one install script. The deploy flow lives
in `scripts/deploy.ts` and is wired to `bun run deploy`.

## Prerequisites on the target

A Debian/Ubuntu-ish Linux box with:

- Bun 1.3+ at `/usr/local/bin/bun`
- Docker running, with the daemon socket at `/var/run/docker.sock`
- Postgres reachable (see `services-install.sh` if you want Castle to set
  one up locally)
- A user named `wess` in the `docker` group (the systemd unit runs as this
  user; rename to taste before installing)
- SSH key auth set up; password sudo enabled

## .env on your dev box

```dotenv
SSH_USER=wess
SSH_HOST=192.168.4.87
SSH_PASS=<wess's sudo password>
```

## Deploy

```bash
bun run deploy
```

That runs `scripts/deploy.ts`, which:

1. Calls `scripts/release.sh` → builds `dist/castle.tar.gz`.
   - Vite-builds the SPA into `dist/stage/web/`
   - Bundles `apps/server/src/index.ts` with Bun into `dist/stage/server/castled.js`
   - Tars `dist/stage/` to `dist/castle.tar.gz` (~600 KB)
2. `scp`'s the tarball + `scripts/install.sh` to `/tmp/` on the target.
3. SSHes in and runs `sudo bash /tmp/install.sh` (password from `$SSH_PASS`).
4. Hits `http://$SSH_HOST/api/host` as a smoke test.

## What install.sh does on the target

It runs as root and is idempotent. On every invocation it:

1. **Extracts** the tarball to `/opt/castle/` (web + server).
2. **Resolves the DB password** by reading `CASTLE_DB_PASSWORD` from
   `/etc/castle-services/services.env` (written by `services-install.sh`
   the first time around).
3. **Writes `/etc/castle/castle.env`** the first time — generates `SECRET`
   and an admin password, prints them. On re-installs it preserves the file
   and just keeps `HOST` / `DATABASE_URL` in sync.
4. **Writes the systemd unit** at `/etc/systemd/system/castled.service`:
   - Runs as `wess` with the `docker` supplementary group.
   - `EnvironmentFile=/etc/castle/castle.env`.
   - `ExecStart=/usr/local/bin/bun run /opt/castle/server/castled.js`.
5. **Installs hand-written nginx site configs** from `/tmp/castle-nginx/` if
   present (legacy — the dynamic vhost generator has taken over for most cases).
6. **Drops the WebSocket map** at `/etc/nginx/conf.d/castle-upgrade.conf`.
7. **Provisions Castle-managed nginx routes**:
   - Creates `/etc/castle/nginx-routes/` owned by `wess`.
   - Writes `/etc/nginx/conf.d/castle-routes.conf` to include that dir.
8. **Installs the `castle-nginx-site` helper** at `/usr/local/bin/`. This
   is what castled invokes via sudo to enable/disable hand-written sites.
9. **Sudoers**: writes `/etc/sudoers.d/castle-nginx` granting `wess`
   passwordless access to:
   - `/bin/systemctl reload nginx`
   - `/usr/local/bin/castle-nginx-site`
10. **Validates nginx config** with `nginx -t`.
11. **Reloads systemd and restarts services** (`castled.service` + `nginx`).
12. **Verifies** both are `active`.

## First install: services-install.sh

If you're standing up a brand-new box, run `scripts/services-install.sh`
first. It provisions:

- Postgres 16 (with a `castle` user + DB)
- `castle-mdns.service` (avahi-publish wrapper, picks the LAN-facing IP)
- The shared env file at `/etc/castle-services/services.env`

Then run `bun run deploy` and the daemon will come up reading the DB URL it
provisioned.

## Updating

```bash
bun run deploy
```

Same command. The unit is restarted; nginx is reloaded if needed; the DB
schema is brought up to date by the `migrate()` call on castled startup
(idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF
NOT EXISTS`).

## Rolling back

There is no built-in rollback. The tarball is small; keep the previous
release somewhere and re-run install.sh against it.

## Manual fallback

If `bun run deploy` is broken for any reason, you can do the same thing by
hand:

```bash
bash scripts/release.sh
scp -i ~/.ssh/id_castle -o StrictHostKeyChecking=no \
  dist/castle.tar.gz scripts/install.sh \
  wess@192.168.4.87:/tmp/
source .env && ssh -i ~/.ssh/id_castle -o StrictHostKeyChecking=no \
  wess@192.168.4.87 "echo '$SSH_PASS' | sudo -S bash /tmp/install.sh"
```

## After deploy

- Visit `http://<host>/` — Castle web UI.
- Visit `http://<host>/api/host` — quick liveness check.
- Tail logs: `ssh ... 'sudo journalctl -u castled.service -f --no-pager'`.

## Troubleshooting

- **Daemon won't start, Postgres errors**: check `/etc/castle/castle.env`
  for `DATABASE_URL`. If you changed the DB password, `services-install.sh`
  rewrites `services.env` but not `castle.env` — fix `castle.env` by hand
  and `systemctl restart castled.service`.
- **`sudo: a password is required`** in deploy output: the `SSH_PASS` env
  var is wrong, or sudoers entries for `wess` are not configured. Run the
  install once with an interactive sudo prompt to fix.
- **nginx vhost not picking up**: check `/etc/castle/nginx-routes/<name>.conf`
  exists and `nginx -t` is clean.
- **mDNS not resolving**: see the bottom of [routing.md](routing.md).
