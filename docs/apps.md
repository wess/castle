# Apps

Castle ships with a curated catalog of self-hosted apps that install in
one click. Each entry is a typed template; the installer pulls the image(s),
generates labels and ports, registers a `*.local` alias, and (when a backend
is added) generates an nginx vhost.

## What's in the catalog

| ID              | App                | Image                                | Multi-service |
| --------------- | ------------------ | ------------------------------------ | ------------- |
| `ollama`        | Ollama             | `ollama/ollama:latest`               | no (GPU)      |
| `tangle`        | Tangle (git)       | `wess/tangle:main`                   | yes (+ pg)    |
| `stohr`         | Stohr (storage)    | `wess/stohr:main`                    | yes (+ pg)    |
| `jellyfin`      | Jellyfin           | `jellyfin/jellyfin:latest`           | no            |
| `vaultwarden`   | Vaultwarden        | `vaultwarden/server:latest`          | no            |
| `uptimekuma`    | Uptime Kuma        | `louislam/uptime-kuma:1`             | no            |
| `homeassistant` | Home Assistant     | `homeassistant/home-assistant:stable`| no            |
| `adguard`       | AdGuard Home       | `adguard/adguardhome:latest`         | no            |
| `n8n`           | n8n                | `n8nio/n8n:latest`                   | no            |
| `paperless`     | Paperless-ngx      | `ghcr.io/paperless-ngx/paperless-ngx:latest` | yes (+ pg) |

The full source is `packages/apps/src/catalog.ts`.

## Installing

From the **Apps** page in the web UI:

1. Click the card.
2. Enter an **instance name** — this becomes the container name, the volume
   prefix, and the `*.local` hostname.
3. Click **Install**.

Behind the scenes:

1. Each service in the template is pulled in dependency order.
2. Containers are created with labels:
   - `castle.app=<appId>`
   - `castle.instance=<name>`
   - `castle.service=<service-key>`
   - `castle.role=primary|db|cache|worker`
3. Ports are deterministically hashed off `(instance, container-port)` and
   bound to `0.0.0.0`.
4. Volumes are named `castle_<instance>_<service>_<volume-name>`.
5. The primary service container is named `<instance>`; non-primary
   services are named `<instance>-<service-key>`.
6. The hostname `<instance>.local` is registered via mDNS.

After install you'll see a toast with the canonical URL, e.g.
`http://my-jellyfin.local:38291`.

## Template format

`AppTemplate` (in `packages/apps/src/types.ts`):

```ts
type AppTemplate = {
  id: string             // catalog id, e.g. "ollama"
  name: string           // display name
  description: string
  category: string       // "AI" | "Media" | ...
  icon: string           // lucide-react icon name
  docs?: string          // upstream docs URL
  multi: boolean         // surfaces in UI; informational
  services: AppService[]
}

type AppService = {
  key: string                          // service id within the app, e.g. "db" or "app"
  role: "primary" | "db" | "cache" | "worker"
  image: string                        // docker reference
  ports?: AppPort[]                    // exposed ports; first or `primary: true` becomes the URL
  env?: Record<string, string>         // values run through variable expansion
  volumes?: AppVolume[]                // named volumes
  cmd?: string[]
  dependsOn?: string[]                 // other service keys; controls install order
  generateSecrets?: string[]           // names of secrets to generate (32 hex bytes)
  gpu?: boolean                        // pass --gpus all (NVIDIA via DeviceRequests)
}
```

## Variable expansion

Inside `env` values you can reference:

- `${INSTANCE}` — user-supplied instance name
- `${SECRET:KEY}` — substitutes a generated secret (must be listed in
  `generateSecrets` of at least one service in the template)
- `${INPUT:KEY}` — substitutes a user-supplied prompt input

Example from `tangle`:

```ts
env: {
  DATABASE_URL: "postgres://postgres:${SECRET:POSTGRES_PASSWORD}@${INSTANCE}-db:5432/tangle",
  SECRET: "${SECRET:SECRET}",
  APP_URL: "http://${INSTANCE}.local",
},
```

Secrets are shared across services for the same install — `db` declares
`POSTGRES_PASSWORD` in `generateSecrets`, and `app` references it in its env.

## Multi-service installs

When `multi: true`, the installer:

1. Sorts services by `dependsOn` (topological).
2. Pulls + creates + starts each in order.
3. Sets up Docker DNS-friendly container names so the `app` service can
   reach `db` as `<instance>-db:5432`.

Example: a Tangle install named `tangle1` produces:

- container `tangle1-db` (postgres)
- container `tangle1` (Tangle's primary service)
- volumes `castle_tangle1_db_pgdata`, `castle_tangle1_app_repos`,
  `castle_tangle1_app_blobs`
- alias `tangle1.local`

## GPU passthrough

A service with `gpu: true` will be created with Docker `DeviceRequests`
equivalent to `--gpus all`:

```json
{ "Driver": "nvidia", "Count": -1, "Capabilities": [["gpu"]] }
```

For this to work you need the NVIDIA driver + nvidia-container-toolkit on
the host. See [GPU](gpu.md).

The Ollama catalog entry has `gpu: true` so a fresh install lands on a
GPU-accelerated container by default.

## Uninstalling

From the Apps page, click the trash icon on an installed row. Castle:

1. Stops and removes every container labeled with that instance.
2. Removes the `*.local` alias.
3. Reloads mDNS.

Volumes are **not** removed. If you want to wipe data:

```bash
docker volume ls | grep castle_<instance>_
docker volume rm castle_<instance>_<service>_<vol>
```

## Adding a new app to the catalog

1. Add an entry to `packages/apps/src/catalog.ts`.
2. Pick an icon name from `lucide-react` and add it to the `ICONS` map in
   `apps/web/src/pages/apps/index.tsx` if not already there.
3. Use `${INSTANCE}-<service-key>` for inter-service hostnames so Docker DNS
   resolves them inside the user-defined bridge.
4. If the upstream image isn't on Docker Hub, prefix the ref:
   `ghcr.io/...`, `quay.io/...`, etc.
5. Deploy.

## Known limits

- The default network for installed apps is Docker's default bridge, which
  means inter-container DNS works for app-internal services (since they
  share the bridge) but not across separate installs. Use a user-defined
  network in your template if you need cross-app DNS.
- There's no upgrade flow yet — you uninstall and reinstall. Volumes
  persist, so data survives.
- No health checks beyond what the image bakes in. Castle doesn't yet
  poll containers and surface red dots in the UI.
- Apps page doesn't yet ask for required `prompts` (e.g. an API key for an
  app that needs one); when this lands it'll surface a second step in the
  install modal.
