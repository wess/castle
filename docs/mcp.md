# MCP Server

Castle ships its own [Model Context Protocol](https://modelcontextprotocol.io)
server. Enable it and any MCP-aware AI agent (Claude Desktop, Cline,
Cursor, …) can drive your homelab: list containers, start/stop them, pull
images, install apps, read logs, etc.

## Architecture

Transport: **HTTP, JSON-RPC**. The server lives at `POST /api/mcp` and
expects a `Bearer` token in `Authorization`.

This is intentionally simple — no stdio, no SSE. The agent does
`tools/list` then `tools/call` against the endpoint, and Castle's handler
returns standard MCP responses.

## Enable

In the web UI: **MCP Server** in the sidebar → toggle the switch on.

Castle:

1. Generates a 32-byte hex token if one doesn't exist.
2. Stores `mcp_enabled=true` + `mcp_token=<...>` in `settings`.
3. Returns the token; the page reveals it via a password input + a
   regenerate button.

When disabled, `POST /api/mcp` returns `503 mcp disabled`. When the token
is wrong, it returns `401 invalid token`.

## Tools exposed (16)

| Tool                           | Args                 | What                                   |
| ------------------------------ | -------------------- | -------------------------------------- |
| `castle.host.stats`            | —                    | CPU/mem/disk/uptime                    |
| `castle.containers.list`       | —                    | All Docker containers                  |
| `castle.containers.start`      | `id`                 | Start a container                      |
| `castle.containers.stop`       | `id`                 | Stop a container                       |
| `castle.containers.restart`    | `id`                 | Restart                                |
| `castle.containers.logs`       | `id`, `tail?`        | Tail logs (default 200 lines)          |
| `castle.containers.exec`       | `id`, `cmd`          | Run a command (`/bin/sh -c`), capture  |
| `castle.lxc.list`              | —                    | All LXC containers                     |
| `castle.lxc.start`             | `name`               | Start                                  |
| `castle.lxc.stop`              | `name`               | Stop                                   |
| `castle.images.list`           | —                    | Docker images                          |
| `castle.images.pull`           | `ref`                | Pull an image                          |
| `castle.apps.catalog`          | —                    | List 1-click apps                      |
| `castle.apps.installed`        | —                    | List installed app instances           |
| `castle.apps.install`          | `appId`, `name`      | Install an app                         |
| `castle.ollama.models`         | —                    | List Ollama models                     |

Inputs use standard JSON-schema `inputSchema` per tool.

## Connect a client

Open **MCP Server** in the UI. The page shows:

- The endpoint URL (e.g. `http://vegeta.local/api/mcp`)
- A copy-able token
- A pre-built config snippet for Claude Desktop / Cline

The snippet looks like:

```json
{
  "mcpServers": {
    "castle": {
      "transport": "http",
      "url": "http://vegeta.local/api/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### Claude Desktop

Drop the above into `~/Library/Application Support/Claude/claude_desktop_config.json`
under the existing `mcpServers` key (merge if other servers are already
listed). Restart Claude Desktop.

Once connected, Claude can ask "what containers are running on my homelab"
and call `castle.containers.list` to find out.

### Cline / Cursor / others

Same JSON shape, dropped into the client's MCP server list. The transport
name may differ — some call it `streamableHttp`. Castle accepts either.

## Tools-via-MCP example

```bash
TOKEN="$(curl -s http://vegeta.local/api/mcp/info -H "Authorization: Bearer $JWT" | jq -r .token)"

# list tools
curl -s -X POST http://vegeta.local/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq

# call one
curl -s -X POST http://vegeta.local/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"castle.host.stats","arguments":{}}}' | jq
```

## Admin endpoints

(JWT-gated, separate from the bearer-token MCP endpoint.)

| Method | Path                     | Returns                                |
| ------ | ------------------------ | -------------------------------------- |
| GET    | `/api/mcp/info`          | `{enabled, token, endpoint, tools[]}`  |
| PUT    | `/api/mcp/enabled`       | `{enabled: bool}` toggles + ensures token |
| POST   | `/api/mcp/regenerate`    | Regenerates the bearer token           |

Regenerating immediately invalidates the old token; any connected clients
will need their config updated.

## Adding a tool

1. Add an entry to `apps/server/src/mcp/tools.ts`:

```ts
tool({
  name: "castle.something.do",
  description: "Plain-language sentence the LLM will see.",
  inputSchema: {
    type: "object",
    properties: { foo: { type: "string", description: "..." } },
    required: ["foo"],
  },
  handler: async ({ foo }) => {
    // ...do the work...
    return { ok: true }
  },
}),
```

2. Names should be `castle.<area>.<verb>` to stay consistent.
3. Keep results JSON-serializable. The handler return value is wrapped as
   `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }`.
4. Errors propagate as `isError: true` content items with the message.

Redeploy and the tool appears in `tools/list` automatically.

## Security notes

- The token is plain text in the DB and traveled over HTTP. If Castle is
  on a hostile network, front it with TLS-terminating nginx.
- There's no per-tool ACL. Any client with the token has full access to
  every tool.
- Regenerating the token is the only way to revoke access. There's no
  per-client tracking.
