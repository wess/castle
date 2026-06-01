# Architecture

Castle is three artifacts that talk to each other plus a handful of host
services it manages.

```
   ┌───────────────┐    HTTPS/JSON    ┌─────────────┐
   │   web SPA     │ ───────────────► │   castled   │
   │  (Mantine)    │ ◄─────────────── │ Bun daemon  │
   └───────────────┘                  └──────┬──────┘
                                             │
   ┌───────────────┐    HTTPS/JSON           │
   │   castle CLI  │ ────────────────────────┤
   └───────────────┘                         │
                                             │
                            ┌────────────────┼────────────────┐
                            ▼                ▼                ▼
                     ┌─────────────┐  ┌────────────┐  ┌──────────────┐
                     │ docker.sock │  │ lxc-* CLI  │  │   Postgres   │
                     └─────────────┘  └────────────┘  └──────────────┘
                            │                ▲                ▲
                            ▼                │                │
                     ┌─────────────┐         │                │
                     │   Apps      │─────────┘                │
                     │   exec WS   │                          │
                     │   logs WS   │                          │
                     └─────────────┘                          │
                                                              │
                            ┌─────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │   nginx     │  ◄── castled writes vhosts to
                     │  + avahi    │      /etc/castle/nginx-routes/
                     └─────────────┘      and reloads via sudo
```

## The three apps

| App        | What it is                             | Source                |
| ---------- | -------------------------------------- | --------------------- |
| `castled`  | Single-process HTTP+WS daemon          | `apps/server`         |
| `web`      | React/Mantine SPA, Vite-built          | `apps/web`            |
| `castle`   | CLI talking to castled                 | `apps/cli`            |

`castled` is the only thing that touches the host. The web SPA and CLI both
go through the REST API. There is no shared filesystem state between the
three; everything funnels through HTTP.

## castled internals

```
apps/server/src/
  index.ts            Bun.serve fetch + websocket entry
  state.ts            singleton app state (Docker client, Db, cfg)
  config.ts           env → config

  auth/               JWT, login, password hashing, requireAuth pipe
  db/                 Postgres connect + migrations + settings KV
  cors.ts             CORS preflight + headers

  routes/             one file per area
    containers.ts     Docker container CRUD + lifecycle + logs
    images.ts         pull / list / remove
    lxc.ts            LXC CRUD + lifecycle
    host.ts           CPU / mem / disk stats
    networks.ts       Docker networks + host bridges
    storage.ts        ZFS / LVM / dir pools + volumes
    apps.ts           catalog list, installed list, install, uninstall
    ollama.ts         status, models, settings, pulls, chats
    mcp.ts            JSON-RPC over HTTP for AI agents
    routes.ts         host_routes CRUD + nginx-sites mgmt
    domains.ts        plain mDNS aliases (no nginx)
    settings.ts       global settings
    index.ts          composition + auth gating

  ws/                 WebSocket handlers
    router.ts         upgrade + dispatch
    auth.ts           token-from-query
    exec/docker.ts    Docker exec hijack ↔ WS
    exec/lxc.ts       Bun.spawn(lxc-attach) ↔ WS

  ollama/             persistent chats + durable pull jobs
    chats.ts          ollama_chats CRUD
    jobs.ts           in-memory pull pump registry

  hosts/              nginx vhost generation + manual site mgmt
    store.ts          host_routes CRUD
    nginx.ts          render conf, write file, reload via sudo
    sites.ts          list/enable/disable manual sites via helper

  mcp/                JSON-RPC server
    handler.ts        protocol implementation
    tools.ts          16 Castle tools

  spa.ts              static SPA serving for the built web bundle
```

Every route file exports an array of `Route` records from `@atlas/server`.
`routes/index.ts` composes them, gates with `requireAuth` (except `/api/auth/*`
and `/api/mcp` which has its own bearer-auth).

## Database

Single Postgres database. Schema lives in `apps/server/src/db/init.ts`,
executed at startup as a series of `CREATE TABLE IF NOT EXISTS` + `ALTER
TABLE ADD COLUMN IF NOT EXISTS` statements. There is no migration framework
yet — pragmatic for a single-instance product.

Tables:
- `users` — admin accounts (single user expected today)
- `settings` — key/value, types in `SettingsMap`
- `pools` — storage pool registrations
- `host_routes` — nginx vhost intents (hostname, backend, locations JSONB)
- `ollama_chats` — persistent chat history per user
- `dbm_*` — the embedded DB manager (separate concern)

## State outside the database

These live on disk on the host:
- `/etc/castle/mdns-aliases` — flat file, one `*.local` hostname per line.
  Re-read on every `castle-mdns.service` restart.
- `/etc/castle/nginx-routes/*.conf` — generated nginx vhosts. Owned by
  `wess`, written by castled, included by `/etc/nginx/conf.d/castle-routes.conf`.
- `/etc/castle/castle.env` — runtime env for the systemd unit.
- `/var/lib/castle/` — reserved for future stateful data.

## How privileged operations work

castled runs as `wess`, not root. For things that need root, it shells out
through specific, narrowly-scoped sudoers entries:

```
wess ALL=(root) NOPASSWD: /bin/systemctl restart castle-mdns.service
wess ALL=(root) NOPASSWD: /bin/systemctl reload nginx
wess ALL=(root) NOPASSWD: /usr/local/bin/castle-nginx-site
```

- mDNS re-publish: `sudo systemctl restart castle-mdns.service`
- nginx reload: `sudo systemctl reload nginx`
- enable/disable hand-written nginx sites: `sudo castle-nginx-site enable|disable <name>`

## How Castle talks to Docker

Through the unix socket (`/var/run/docker.sock`), using Bun's native
`fetch({ unix })`. For full-duplex needs (exec console), it does its own
HTTP-upgrade-and-hijack via `Bun.connect({ unix })` — see
`packages/docker/src/client.ts` `hijack()`.

## How Castle talks to LXC

Through `Bun.spawn(["lxc-attach", ...])`, etc. The package wraps each
operation in a small typed function; everything funnels through `must()` or
`exec()` in `packages/lxc/src/exec.ts`.

## What Castle *doesn't* do

- It is not a cluster manager. Single node.
- It does not bundle Ollama / nginx / Postgres. They are external services
  Castle assumes exist (provisioned by `install.sh` or by you).
- It does not currently do TLS termination. nginx serves plain HTTP on `:80`.
- It is not multi-tenant. One user, full admin.

## See also

- [Deploy](deploy.md) — what `install.sh` does on a fresh box.
- [Conventions](conventions.md) — hard rules for code in this repo.
