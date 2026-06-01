# Castle — hard rules for AI sessions

Read this first.

## What Castle is

A single-node, homelab-focused alternative to Proxmox. Manages Docker containers
and LXC system containers on a Linux host. Castled is a Bun daemon that exposes
a REST/WS API; the web UI is a Mantine SPA; the CLI is `castle`.

## Hard conventions

- **Functional only.** No `class`. Composition over inheritance. Immutable data.
- **Bun-native.** `Bun.serve`, `bun:sqlite`, `Bun.spawn`, `Bun.file`, `Bun.password`.
  Never reach for Node equivalents.
- **TypeScript strict.** Prefer `type` aliases over `interface`. Prefer inference.
- **Filenames: lowercase, no `-`, `_`, or spaces.** Use directory hierarchy:
  `src/docker/list.ts` not `src/docker-list.ts`.
- **Small files.** One responsibility per file. Re-export from `index.ts`.
- **Built on Atlas.** Installed as a bun package (`atlas: github:wess/atlas#main`).
  Use `@atlas/*` imports — they resolve via `tsconfig.json` `paths` to
  `node_modules/atlas/packages/*`. Bump with `bun update atlas`.
- **No external runtime deps unless necessary.** Atlas already covers HTTP, DB,
  auth, CLI, UI.
- **Don't write comments that restate code.** Only comment non-obvious *why*.

## Layout

```
node_modules/atlas/          atlas, installed via bun
packages/
  core/                      domain types, ids, errors
  docker/                    docker engine adapter (unix socket)
  lxc/                       lxc-cli adapter
  network/                   bridges, port maps
  storage/                   pools, volumes
apps/
  server/                    castled daemon
  web/                       mantine SPA
  cli/                       castle command
```

## Do not

- Don't add `class` anywhere.
- Don't put dashes/underscores in filenames.
- Don't add npm deps when a Bun or Atlas API exists.
- Don't shell out via `child_process`; use `Bun.spawn`.
- Don't manage state in module-level mutable bindings; pass context.
- Don't mention Claude/Anthropic in commits or PRs.
