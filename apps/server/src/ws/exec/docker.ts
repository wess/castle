import { containers, type HijackedSocket } from "@castle/docker";
import type { ServerWebSocket } from "bun";
import { app } from "../../state.ts";
import type { WsData } from "../router.ts";

type DockerExecState = {
  socket: HijackedSocket | null;
  resize: ((cols: number, rows: number) => Promise<void>) | null;
  closed: boolean;
};

const stateOf = (ws: ServerWebSocket<WsData>): DockerExecState => {
  if (!ws.data.state) ws.data.state = { socket: null, resize: null, closed: false } satisfies DockerExecState;
  return ws.data.state as DockerExecState;
};

export const dockerExecOpen = (ws: ServerWebSocket<WsData>): void => {
  const st = stateOf(ws);
  containers
    .openExec(app().docker, ws.data.target, { cmd: ws.data.cmd, tty: true })
    .then(async (handle) => {
      st.socket = handle.socket;
      st.resize = handle.resize;
      handle.socket.onData((chunk) => {
        if (st.closed) return;
        ws.send(chunk);
      });
      handle.socket.onClose(() => {
        if (st.closed) return;
        st.closed = true;
        try {
          ws.close(1000, "exec exited");
        } catch {}
      });
      try {
        await handle.resize(ws.data.cols, ws.data.rows);
      } catch {}
    })
    .catch((err) => {
      try {
        ws.send(`\r\n\x1b[31mexec failed: ${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`);
        ws.close(1011, "exec failed");
      } catch {}
    });
};

export const dockerExecMessage = (ws: ServerWebSocket<WsData>, msg: string | Buffer): void => {
  const st = stateOf(ws);
  if (typeof msg === "string" && msg.startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.type === "resize" && st.resize) {
        const cols = Number(parsed.cols) || 80;
        const rows = Number(parsed.rows) || 24;
        st.resize(cols, rows).catch(() => {});
        return;
      }
      if (parsed?.type === "in" && typeof parsed.data === "string") {
        st.socket?.write(parsed.data);
        return;
      }
    } catch {}
  }
  if (st.socket) {
    st.socket.write(msg instanceof Buffer ? new Uint8Array(msg) : msg);
  }
};

export const dockerExecClose = (ws: ServerWebSocket<WsData>): void => {
  const st = stateOf(ws);
  st.closed = true;
  st.socket?.close();
};
