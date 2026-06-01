# Castle

A homelab control plane for a single Linux box. Manages Docker containers, LXC
system containers, networks, storage, and ships with a small Apps catalog,
hostname/proxy routing, an Ollama console, and a built-in MCP server so AI
agents can drive your homelab.

Built on [Atlas](https://github.com/wess/atlas). Bun + TypeScript, functional,
no classes.

```
        ┌──────────────────────────────────────┐
        │                Castle                │
        │ ┌─────────┐ ┌────────┐ ┌──────────┐  │
        │ │ castled │ │  web   │ │  castle  │  │
        │ │  Bun    │ │ Mantine│ │   CLI    │  │
        │ │ daemon  │ │  SPA   │ │          │  │
        │ └────┬────┘ └────────┘ └──────────┘  │
        │      │                               │
        │      ├─ Docker engine (unix socket)  │
        │      ├─ LXC (lxc-* binaries)         │
        │      ├─ nginx (vhost generation)     │
        │      ├─ avahi (mDNS alias publish)   │
        │      └─ Ollama (HTTP API)            │
        └──────────────────────────────────────┘
```

## What it does

| Area          | Today                                                                |
| ------------- | -------------------------------------------------------------------- |
| **Workloads** | Docker container CRUD, LXC CRUD, web exec console (xterm.js over WS) |
| **Images**    | List, pull (background jobs with progress), remove                   |
| **Network**   | Docker networks, host bridges, port-forwards                         |
| **Storage**   | ZFS / LVM / directory pools, Docker volumes                          |
| **Apps**      | 1-click installs (Ollama, Tangle, Stohr, Jellyfin, Vaultwarden, ...) |
| **Routing**   | `*.local` mDNS + auto-generated nginx vhosts                         |
| **Ollama**    | Chat with persistent history, model pull (durable, background)       |
| **MCP**       | Built-in MCP server exposes 16 tools to AI agents (Claude, Cline, …) |
| **GPU**       | NVIDIA passthrough via Docker `DeviceRequests` (Castle managed)      |
| **Auth**      | JWT, single-admin or optional auth-disabled mode                     |

## Quickstart (development)

```bash
bun install
cp env.example .env
bun run dev
```

- castled binds on `:4280`
- web dev server on `:5173` (proxies `/api` to castled)

The first sign-up becomes the admin. To skip auth in development:

```sql
INSERT INTO settings (key, value) VALUES ('auth_required', 'false');
```

## Deploy

Castle deploys as a single tarball + a small install script. Configure
`SSH_HOST`, `SSH_USER`, `SSH_PASS` in `.env`, then:

```bash
bun run deploy
```

That runs `scripts/release.sh` → scp → `sudo bash install.sh` on the target.
The install script provisions Postgres, systemd, nginx, mDNS, sudoers, and
the `castle-nginx-site` helper.

See [docs/deploy.md](docs/deploy.md) for the full sequence and what install.sh
touches on the host.

## Repo layout

```
packages/
  core           shared domain types (Workload, HostStats, …)
  docker         Docker engine adapter — unix-socket HTTP + hijack
  lxc            lxc-* CLI adapter
  network        bridge / port-forward management
  storage        ZFS/LVM/directory pool management
  apps           apps catalog + multi-service installer
  ollama         Ollama HTTP client

apps/
  server         castled daemon — REST + WS, routes, MCP, jobs
  web            React/Mantine SPA
  cli            castle command

scripts/
  release.sh     build dist/castle.tar.gz
  install.sh     server-side install (run as root)
  deploy.ts      release → scp → install (bun run deploy)
  services/      systemd units + helper scripts
```

## Documentation

| Doc                                          | What's in it                                |
| -------------------------------------------- | ------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | How the pieces fit together                 |
| [docs/getting-started.md](docs/getting-started.md) | Local dev, first login                |
| [docs/deploy.md](docs/deploy.md)             | Production deploy walkthrough               |
| [docs/apps.md](docs/apps.md)                 | 1-click installs, catalog, multi-service    |
| [docs/routing.md](docs/routing.md)           | Hosts/routes, nginx vhost generation, mDNS  |
| [docs/ollama.md](docs/ollama.md)             | Ollama integration: chat, models, cloud     |
| [docs/mcp.md](docs/mcp.md)                   | MCP server, tool list, client config        |
| [docs/gpu.md](docs/gpu.md)                   | NVIDIA driver + container toolkit setup     |
| [docs/api.md](docs/api.md)                   | REST/WS reference                           |
| [docs/cli.md](docs/cli.md)                   | `castle` command reference                  |
| [docs/conventions.md](docs/conventions.md)   | Code style, file naming, design rules       |

## Status

Active development. The API surface is stabilizing but expect breaking changes
between commits. This is built for one user (me) and one box (vegeta) right
now — if you're brave enough to run it, file issues.

## License

Apache 2.0 — see [LICENSE](LICENSE).
