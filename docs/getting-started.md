# Getting started

Castle is a workspace of Bun packages. Local dev runs castled and the Vite
dev server side-by-side via foreman.

## Prerequisites

- **Bun** 1.3+
- **Postgres** 14+ reachable from your dev box
- **Docker** running (for actual workload management)
- **LXC** (`lxc-*` binaries on PATH) if you want to manage system containers
- macOS or Linux for development; Linux for actual deployment

## First-time setup

```bash
# Clone the repo
git clone https://github.com/wess/castle && cd castle

# Atlas is symlinked from your local checkout in dev. If you don't have
# it locally, fetch a snapshot:
curl -sL https://github.com/wess/atlas/archive/refs/heads/main.zip -o /tmp/atlas.zip
unzip -q /tmp/atlas.zip -d /tmp/atlas-expand
mv /tmp/atlas-expand/atlas-main ./atlas
rm -rf /tmp/atlas.zip /tmp/atlas-expand

# Install deps
bun install

# Configure env
cp env.example .env
$EDITOR .env
```

The defaults are:

```dotenv
PORT=4280
HOST=0.0.0.0
DATABASE_URL=postgres://user:pass@localhost:5432/castle
SECRET=change-me-to-a-long-random-string
DOCKER_SOCKET=/var/run/docker.sock
LXC_ROOT=/var/lib/lxc
WEB_ORIGIN=http://localhost:5173

# Used by bun run deploy; safe to leave blank in pure dev
SSH_USER=
SSH_HOST=
SSH_PASS=
```

Generate a real `SECRET`:

```bash
openssl rand -hex 48
```

## Run

```bash
bun run dev
```

This spawns the Procfile via `@atlas/cli`'s foreman:

- `castled` on `:4280`
- web dev server on `:5173` (proxies `/api` → `:4280`)

Open <http://localhost:5173>. You'll get the login page.

## Logging in

On first run there are no users. Castle's daemon bootstraps an admin from
env vars if they're set:

```dotenv
CASTLE_ADMIN_EMAIL=you@example.com
CASTLE_ADMIN_PASSWORD=change-me
```

Set those, restart castled, and the admin will be inserted.

If you'd rather not bother with auth in dev:

```bash
psql "$DATABASE_URL" -c "INSERT INTO settings (key, value) VALUES ('auth_required', 'false') ON CONFLICT (key) DO UPDATE SET value = 'false';"
```

This makes every API call resolve as the first user in the DB.

## What you should see

- **Dashboard** — host CPU/mem/disk/uptime
- **Apps** — the catalog (Ollama, Tangle, Stohr, Jellyfin, …)
- **Ollama** — Chat / Models / Settings tabs. If you haven't installed
  Ollama, the Models tab tells you and links you to /apps.
- **MCP Server** — disabled by default. Toggle on to issue a token.
- **Containers / Images / LXC / Networks / Storage** — host-managed bits.
- **Domains** — Castle-managed `.local` aliases + nginx vhosts, plus a
  read-only view of any hand-written `sites-available/` files.
- **Settings** — auth toggle, MCP toggle, Ollama URL.

## Common dev tasks

```bash
# Typecheck the whole repo
bunx tsc --noEmit

# Format + lint (biome)
bun run tidy

# Build production artifacts to dist/castle.tar.gz
bash scripts/release.sh

# Deploy to your homelab box (requires SSH_* in .env)
bun run deploy

# Run just one app
bun run dev:server   # castled
bun run dev:web      # vite
```

## Where to go next

- [Deploy](deploy.md) — push Castle to a real Linux box.
- [Apps](apps.md) — what's in the catalog and how to install.
- [MCP](mcp.md) — wire your AI agent to Castle.
- [Conventions](conventions.md) — read this before sending a PR.
