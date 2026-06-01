# `castle` CLI

A thin command-line client that talks to castled via HTTP/WS. Useful for
shell-level workflows when you don't want to leave the terminal.

## Build / install

```bash
bun build apps/cli/src/index.ts --target=bun --outdir=dist/cli --minify
# Or run directly:
bun run apps/cli/src/index.ts <command>
```

A precompiled binary lives at `/opt/castle/cli/castle` on the homelab.

## Config

The CLI reads:

- `CASTLE_URL` — defaults to `http://localhost:4280`
- `CASTLE_TOKEN` — optional JWT; if auth is enabled, set this

## Commands

```
castle host
  Print host stats (CPU, mem, disk, uptime).

castle ps
  List Docker containers.

castle run <image> [--name=…] [-p host:container] [-e KEY=VAL]
  Create and start a container.

castle start <id|name>
castle stop <id|name>
castle restart <id|name>
castle rm <id|name> [-f]

castle logs <id|name> [-n N | --tail N]
  Stream demux'd logs.

castle exec <id|name> [cmd...]
  Interactive shell into a Docker container.
  Sets the local TTY to raw mode and forwards SIGWINCH for resize.

castle lxc ls
castle lxc start <name>
castle lxc stop <name>
castle lxc destroy <name> [-f]

castle lxc-exec <name> [cmd...]
  Interactive shell into an LXC container.

castle nets
  List Docker networks + host bridges.

castle pools
  List storage pools registered with Castle.
```

## Exec details

`castle exec` and `castle lxc-exec` open a WebSocket to
`/api/containers/:id/exec` or `/api/lxc/:name/exec`, set `stdin` raw, and:

- Forward stdin bytes as `{type:"in", data}`
- Send `{type:"resize", cols, rows}` on `SIGWINCH`
- Pipe server-sent bytes (raw stdout) to `process.stdout`
- Exit with the WebSocket close code (0 if `code === 1000`, else 1)

LXC exec uses plain `Bun.spawn(["lxc-attach", "-n", NAME, "--", ...cmd])` on
the server side — no PTY. This is fine for basic commands; full-screen apps
(vim, htop) may not render correctly. Docker exec uses the daemon's TTY
hijack and renders properly.

## Example session

```bash
$ export CASTLE_URL=http://vegeta.local
$ export CASTLE_TOKEN=eyJhb...

$ castle host
hostname  vegeta
kernel    Linux 6.12.90+deb13-amd64
uptime    3d 14h 22m
cpu       12.4% (12 cores)
memory    7.1 GB / 31.4 GB
disk      120 GB / 916 GB

$ castle ps
NAME             IMAGE                STATE    PORTS
ollama           ollama/ollama:latest running  39617→11434
tangle1          wess/tangle:main     running  31288→3001
tangle1-db       postgres:16-alpine   running

$ castle exec ollama bash
root@ollama:/# nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 2060 SUPER (UUID: ...)
root@ollama:/#
```

## What the CLI doesn't do (yet)

- No Ollama chat/pull commands (just use the web UI or curl).
- No MCP tool invocation (use the web UI to grab the token, then curl JSON-RPC).
- No apps install/uninstall (web UI only).
- No host route management (web UI).

Adding any of these is a `command(...)` in `apps/cli/src/commands/` + an
entry in `apps/cli/src/index.ts`. Follow the existing patterns.
