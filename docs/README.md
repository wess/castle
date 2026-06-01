# Castle docs

Documentation for Castle, a homelab control plane for a single Linux box.

## Read in this order

1. [Architecture](architecture.md) — how castled, web, the CLI, and the
   adapters fit together.
2. [Getting started](getting-started.md) — local dev loop, first run, auth.
3. [Deploy](deploy.md) — `bun run deploy`, what install.sh does, the systemd
   unit, the nginx + mDNS provisioning.

## Features

- [Apps catalog](apps.md) — 1-click installs, template format, multi-service
  apps, GPU passthrough.
- [Hosts & routing](routing.md) — `*.local` aliases, generated nginx vhosts,
  multi-location routes, the "Manual nginx sites" management UI.
- [Ollama](ollama.md) — chat, models, persistent history, durable pull jobs,
  local vs cloud.
- [MCP server](mcp.md) — what tools Castle exposes, how to wire Claude
  Desktop / Cline / Cursor.
- [GPU](gpu.md) — NVIDIA driver install, container toolkit, what the `gpu:
  true` flag in app templates does.

## Reference

- [REST + WebSocket API](api.md)
- [CLI](cli.md)

## Working in the repo

- [Conventions](conventions.md) — functional only, lowercase filenames,
  Bun-native, etc. Hard rules.
