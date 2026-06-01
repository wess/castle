import type { ServerWebSocket, Subprocess } from "bun";
import type { WsData } from "../router.ts";

type LxcExecState = {
  proc: Subprocess<"pipe", "pipe", "pipe"> | null;
  closed: boolean;
};

const stateOf = (ws: ServerWebSocket<WsData>): LxcExecState => {
  if (!ws.data.state) ws.data.state = { proc: null, closed: false } satisfies LxcExecState;
  return ws.data.state as LxcExecState;
};

const pumpStream = async (
  stream: ReadableStream<Uint8Array>,
  ws: ServerWebSocket<WsData>,
  st: LxcExecState,
): Promise<void> => {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done || st.closed) break;
    if (value) ws.send(value);
  }
};

export const lxcExecOpen = (ws: ServerWebSocket<WsData>): void => {
  const st = stateOf(ws);
  try {
    const proc = Bun.spawn(["lxc-attach", "-n", ws.data.target, "--", ...ws.data.cmd], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "xterm-256color" },
    });
    st.proc = proc;

    pumpStream(proc.stdout, ws, st).catch(() => {});
    pumpStream(proc.stderr, ws, st).catch(() => {});

    proc.exited
      .then((code) => {
        if (st.closed) return;
        st.closed = true;
        try {
          ws.send(`\r\n[process exited with code ${code}]\r\n`);
          ws.close(1000, "exec exited");
        } catch {}
      })
      .catch(() => {});
  } catch (err) {
    try {
      ws.send(`\r\n\x1b[31mlxc-attach failed: ${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`);
      ws.close(1011, "exec failed");
    } catch {}
  }
};

export const lxcExecMessage = (ws: ServerWebSocket<WsData>, msg: string | Buffer): void => {
  const st = stateOf(ws);
  if (!st.proc) return;

  if (typeof msg === "string" && msg.startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.type === "resize") return;
      if (parsed?.type === "in" && typeof parsed.data === "string") {
        st.proc.stdin.write(parsed.data);
        return;
      }
    } catch {}
  }
  const data = typeof msg === "string" ? msg : new Uint8Array(msg);
  st.proc.stdin.write(data as any);
};

export const lxcExecClose = (ws: ServerWebSocket<WsData>): void => {
  const st = stateOf(ws);
  st.closed = true;
  try {
    st.proc?.kill();
  } catch {}
};
