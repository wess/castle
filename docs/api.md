# REST + WebSocket API

Castle's HTTP surface lives at `/api/*`. Most endpoints require `Authorization:
Bearer <jwt>` (JWT from `/api/auth/login`); the MCP endpoint uses its own bearer
token. WebSocket endpoints take the token via `?token=` query param because
browser WebSocket APIs can't set headers.

Auth is gated centrally via `requireAuth` in `apps/server/src/routes/index.ts`;
when `auth_required=false` in settings, the first user in the DB is implicitly
authenticated.

All JSON request bodies are `Content-Type: application/json`. All errors come
back as `{ error: "..." }` with an appropriate status code; the web client
extracts that into a clean message.

## Auth

| Method | Path                  | Description                          |
| ------ | --------------------- | ------------------------------------ |
| GET    | `/api/auth/status`    | `{authRequired, user?}` — no auth    |
| POST   | `/api/auth/login`     | `{email, password}` → `{token, user}`|
| GET    | `/api/auth/me`        | Current user                         |

## Host

| Method | Path                | Returns                                  |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/api/host`         | `HostStats` (cpu, memory, disk, uptime)  |
| GET    | `/api/host/engine`  | Docker engine info                       |

## Containers

| Method | Path                              | Description                       |
| ------ | --------------------------------- | --------------------------------- |
| GET    | `/api/containers`                 | List all (running + stopped)      |
| POST   | `/api/containers`                 | Create (`CreateContainerSpec`)    |
| GET    | `/api/containers/:id`             | Inspect                           |
| DELETE | `/api/containers/:id?force=0|1`   | Remove                            |
| POST   | `/api/containers/:id/start`       | Start                             |
| POST   | `/api/containers/:id/stop`        | Stop                              |
| POST   | `/api/containers/:id/restart`     | Restart                           |
| POST   | `/api/containers/:id/pause`       | Pause                             |
| POST   | `/api/containers/:id/unpause`     | Unpause                           |
| GET    | `/api/containers/:id/logs?tail=N` | Stream demux'd logs               |
| WS     | `/api/containers/:id/exec`        | Interactive shell (xterm.js)      |

WS exec query params: `cmd` (JSON array, default `["/bin/sh"]`), `cols`, `rows`,
`token`. Messages from client are JSON `{type:"in", data}` or `{type:"resize",
cols, rows}`. Server sends raw stdout bytes.

## Images

| Method | Path                                       | Description |
| ------ | ------------------------------------------ | ----------- |
| GET    | `/api/images`                              | List        |
| POST   | `/api/images/pull` `{ref}`                 | Pull        |
| DELETE | `/api/images/:ref?force=0|1`               | Remove      |

The pull route surfaces Docker's per-layer error events; if the registry
returns `errorDetail`, the route returns 502 with the message.

## LXC

| Method | Path                       | Description                        |
| ------ | -------------------------- | ---------------------------------- |
| GET    | `/api/lxc`                 | List                               |
| POST   | `/api/lxc`                 | Create                             |
| GET    | `/api/lxc/:name`           | Inspect                            |
| POST   | `/api/lxc/:name/start`     | Start                              |
| POST   | `/api/lxc/:name/stop`      | Stop                               |
| DELETE | `/api/lxc/:name?force=0|1` | Destroy                            |
| WS     | `/api/lxc/:name/exec`      | Interactive shell (xterm.js)       |

## Networks

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/networks`     | List (docker + host bridges)         |
| POST   | `/api/networks`     | Create Docker network                |
| DELETE | `/api/networks/:id` | Remove Docker network                |

## Storage

| Method | Path              | Description                         |
| ------ | ----------------- | ----------------------------------- |
| GET    | `/api/storage`    | Pools + Docker volumes              |
| POST   | `/api/storage`    | Register a pool (zfs/lvm/dir)       |
| DELETE | `/api/storage/:id`| Unregister                          |

## Apps

| Method | Path                        | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| GET    | `/api/apps`                 | Catalog                               |
| GET    | `/api/apps/installed`       | Live installed instances              |
| POST   | `/api/apps/install`         | `{appId, name, inputs?}`              |
| DELETE | `/api/apps/:instance`       | Stop + remove all containers          |

The install creates one container per service in the template, registers a
`<name>.local` alias, and reloads mDNS. Volumes persist on uninstall.

## Hosts / routes

| Method | Path                                | Description                          |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/api/routes`                       | Castle-managed routes (hostname→backend) |
| POST   | `/api/routes`                       | Create                               |
| PUT    | `/api/routes/:hostname`             | Update backend/websocket/locations   |
| DELETE | `/api/routes/:hostname`             | Remove + delete vhost                |
| GET    | `/api/nginx/sites`                  | Hand-written sites in sites-available|
| GET    | `/api/nginx/sites/:name`            | Read raw config                      |
| POST   | `/api/nginx/sites/:name/enable`     | Symlink into sites-enabled           |
| POST   | `/api/nginx/sites/:name/disable`    | Remove symlink                       |
| GET    | `/api/domains`                      | Plain mDNS aliases                   |
| POST   | `/api/domains`                      | Add alias (no nginx)                 |
| DELETE | `/api/domains/:name`                | Remove alias                         |
| POST   | `/api/domains/reload`               | Re-publish all aliases               |

`POST /api/routes` payload:

```json
{
  "hostname": "git.local",
  "backend": "127.0.0.1:3001",
  "websocket": true,
  "locations": [
    { "pattern": "~ ^/[^/]+/[^/]+\\.git(?:/|$)",
      "backend": "127.0.0.1:3000",
      "websocket": false }
  ]
}
```

Locations are rendered before the default `location /` so regex/prefix
matches take precedence. Extras are optional; omit for a single-backend route.

## Ollama

See [Ollama](ollama.md) for narrative; endpoints listed at the bottom of that
file.

## MCP

JSON-RPC over HTTP. Token is separate from JWT.

| Method | Path                       | Description                           |
| ------ | -------------------------- | ------------------------------------- |
| POST   | `/api/mcp`                 | Bearer-auth JSON-RPC                  |
| GET    | `/api/mcp/info`            | `{enabled, token, endpoint, tools[]}` |
| PUT    | `/api/mcp/enabled`         | `{enabled: bool}` toggle              |
| POST   | `/api/mcp/regenerate`      | New token                             |

See [MCP](mcp.md) for the protocol and tool list.

## Settings

| Method | Path                | Description                       |
| ------ | ------------------- | --------------------------------- |
| GET    | `/api/settings`     | All settings as a flat object     |
| PUT    | `/api/settings`     | Patch one or more                 |

Known keys (typed in `apps/server/src/db/settings.ts`):

- `auth_required: boolean` — if false, the first user is implicitly authed.
- `ollama_url: string` — base URL for the Ollama HTTP API.
- `ollama_api_key: string` — sent as Bearer when set (for Ollama Cloud).
- `mcp_enabled: boolean` — whether `/api/mcp` accepts traffic.
- `mcp_token: string` — bearer token expected on `/api/mcp`.

## CORS

`OPTIONS /*` returns CORS preflight headers; allowed origin is `WEB_ORIGIN`
from the config (defaults to `*`).

## Errors

Shape: `{ "error": "human-readable string" }`. Status codes follow REST
conventions:

- `400` malformed request
- `401` unauthorized (JWT missing/invalid)
- `404` not found
- `409` conflict (e.g. duplicate app instance name)
- `422` validation failure (e.g. bad hostname)
- `5xx` upstream/internal

The web client (`apps/web/src/api/client.ts`) wraps these as `ApiError` and
exposes `errorMessage(e)` to extract the string cleanly for toasts.
