import { command } from "@atlas/cli";

const base = Bun.env.CASTLE_URL ?? "http://localhost:4280";
const token = Bun.env.CASTLE_TOKEN;

const buildWsUrl = (kind: "containers" | "lxc", target: string, cmd: string[]): string => {
  const url = new URL(`/api/${kind}/${encodeURIComponent(target)}/exec`, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const stdout = process.stdout as unknown as { columns?: number; rows?: number };
  const cols = stdout.columns ?? 80;
  const rows = stdout.rows ?? 24;
  url.searchParams.set("cols", String(cols));
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("cmd", JSON.stringify(cmd));
  if (token) url.searchParams.set("token", token);
  return url.toString();
};

const runExec = async (kind: "containers" | "lxc", target: string, cmd: string[]): Promise<number> => {
  const ws = new WebSocket(buildWsUrl(kind, target, cmd));
  ws.binaryType = "arraybuffer";

  const stdin = process.stdin as unknown as {
    setRawMode?: (raw: boolean) => void;
    resume: () => void;
    pause: () => void;
    on: (ev: string, cb: (data: unknown) => void) => void;
    off: (ev: string, cb: (data: unknown) => void) => void;
  };
  const stdout = process.stdout as unknown as { columns?: number; rows?: number };

  return new Promise<number>((resolve) => {
    let onStdin: ((d: unknown) => void) | null = null;
    let onResize: (() => void) | null = null;

    const cleanup = () => {
      try {
        stdin.setRawMode?.(false);
      } catch {}
      if (onStdin) stdin.off("data", onStdin);
      if (onResize) process.off("SIGWINCH" as any, onResize as any);
      stdin.pause();
    };

    ws.onopen = () => {
      try {
        stdin.setRawMode?.(true);
      } catch {}
      stdin.resume();

      onStdin = (chunk) => {
        const data = chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : String(chunk);
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "in", data }));
      };
      stdin.on("data", onStdin);

      onResize = () => {
        const cols = stdout.columns ?? 80;
        const rows = stdout.rows ?? 24;
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "resize", cols, rows }));
      };
      process.on("SIGWINCH" as any, onResize as any);
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") process.stdout.write(ev.data);
      else process.stdout.write(new Uint8Array(ev.data as ArrayBuffer));
    };

    ws.onerror = () => {
      process.stderr.write("\r\nconnection error\r\n");
    };

    ws.onclose = (ev) => {
      cleanup();
      resolve(ev.code === 1000 ? 0 : 1);
    };
  });
};

export const exec = command("exec", {
  description: "Open an interactive shell in a Docker container",
  args: ["id", "...cmd"],
  run: async ({ args }) => {
    const [id, ...cmd] = args;
    if (!id) {
      console.error("usage: castle exec <id> [cmd...]");
      process.exit(1);
    }
    const code = await runExec("containers", id, cmd.length > 0 ? cmd : ["/bin/sh"]);
    process.exit(code);
  },
});

export const lxcExec = command("lxc-exec", {
  description: "Open an interactive shell in an LXC container",
  args: ["name", "...cmd"],
  run: async ({ args }) => {
    const [name, ...cmd] = args;
    if (!name) {
      console.error("usage: castle lxc-exec <name> [cmd...]");
      process.exit(1);
    }
    const code = await runExec("lxc", name, cmd.length > 0 ? cmd : ["/bin/sh"]);
    process.exit(code);
  },
});
