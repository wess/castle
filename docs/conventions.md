# Conventions

Castle is small and opinionated. These rules are non-negotiable.

## Hard rules

- **Functional only.** No `class`. Composition over inheritance. Immutable
  data. Pass dependencies in, return new values out.
- **Bun-native.** Use `Bun.serve`, `bun:sql`, `Bun.spawn`, `Bun.file`,
  `Bun.password`, `Bun.connect`. Don't reach for the Node equivalents
  unless a Bun primitive doesn't exist.
- **TypeScript strict.** Prefer `type` aliases over `interface`. Prefer
  inference over annotation. `noUncheckedIndexedAccess` is on.
- **Filenames: lowercase, no `-`, `_`, or spaces.** Express hierarchy with
  directories. `src/docker/list.ts` not `src/docker-list.ts`.
- **Small files.** One responsibility per file. Re-export from `index.ts`.
- **Atlas-first.** When a problem can be solved by an Atlas package
  (`@atlas/server`, `@atlas/auth`, `@atlas/cli`, etc.), use it.
- **No external runtime deps unless necessary.** Atlas covers HTTP, DB,
  auth, CLI, UI. Adding npm packages requires a real reason.
- **Don't shell out via `child_process`.** Use `Bun.spawn`.
- **Don't manage state in module-level mutable bindings.** Pass context.
  The one exception: in-memory job registries that are explicitly
  documented as ephemeral (e.g. `apps/server/src/ollama/jobs.ts`).

## Comments

Default to writing **none**.

Only write a comment when the WHY is non-obvious:

- A hidden constraint (e.g. "must run after migration X").
- A subtle invariant.
- A workaround for a specific upstream bug (link to it).
- Behavior that would surprise a reader.

**Never** write comments that:

- Restate what the code does ("// fetch the user")
- Reference the current task or PR ("// added for the X flow")
- Explain a one-liner

If removing the comment wouldn't confuse a future reader, it shouldn't
have existed.

## Error handling

- Throw with useful messages. The message becomes the toast in the UI.
- For HTTP routes, use `halt(c, status, { error: "..." })`.
- Don't swallow errors with `catch {}`. If you must, comment why.
- Stream-based protocols (Docker pull, Ollama pull) need to detect error
  events mid-stream — the success path can't be assumed from a clean
  TCP close.

## Routes

- One file per area in `apps/server/src/routes/`.
- Export an array of `Route` records.
- Compose via `routes/index.ts`.
- Auth gating is in `routes/index.ts` (`requireAuth`). Open routes go in
  `mcpOpenRoutes` / `authRoutes` lists.

## DB

- Schema lives in `apps/server/src/db/init.ts`.
- All migrations are `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD
  COLUMN IF NOT EXISTS`. Idempotent.
- Postgres types lean toward TEXT + BIGINT epoch seconds. JSONB for
  complex shapes.
- Per-feature store modules under `apps/server/src/<feature>/store.ts`
  expose typed `list/get/upsert/remove` etc.

## Privileged operations

Castled runs as `wess`, not root. Anything that requires elevated
privileges must:

1. Have a specific, narrowly-scoped sudoers entry (`/etc/sudoers.d/castle-*`).
2. Be invoked via `Bun.spawn(["sudo", "-n", ...])`.
3. Optionally, ship a helper script in `/usr/local/bin/castle-*` that
   does input validation before the privileged action.

Pattern in use: `castle-nginx-site` for symlink management, `systemctl
reload nginx` for graceful reloads.

## Web UI

- React + Mantine. Use Mantine components — don't roll your own.
- Lucide for icons.
- Tanstack Query for server state. No Redux, no Zustand.
- Error toasts go through `errorMessage(e)` from `apps/web/src/api/client.ts`
  to extract clean strings from `ApiError`.

## Commits / PRs

- No mention of Claude / Anthropic in commit messages, PRs, or code
  comments.
- Per-package files where they belong; don't shotgun changes across
  unrelated packages in one commit.
- I (the user) handle all git interactions. The assistant doesn't push,
  doesn't PR, doesn't `git rebase`.

## Adding a feature

A rough sequence that's worked well:

1. Decide the package boundary. If it's a host integration, it's a new
   `packages/<name>/`. If it's a Castle-internal feature, it's an
   `apps/server/src/<area>/` module + a route file.
2. Types first. Define the shape in `types.ts`.
3. Store module if there's persistent state.
4. Operational module if there's host interaction (`Bun.spawn`,
   `fetch`, files in `/etc/...`).
5. Route file in `apps/server/src/routes/`.
6. Wire into `routes/index.ts`.
7. Web API client in `apps/web/src/api/<name>.ts`.
8. UI page or page section.
9. Nav entry in `apps/web/src/shell.tsx` and route in
   `apps/web/src/app.tsx`.
10. Typecheck (`bunx tsc --noEmit`), build (`bun run --filter @castle/web
    build`), deploy (`bun run deploy`).
