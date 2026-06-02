import type { ServerWebSocket } from "bun";
import { eventsMessage } from "../events/index.ts";
import { authorize } from "./auth.ts";
import { dockerExecClose, dockerExecMessage, dockerExecOpen } from "./exec/docker.ts";
import { lxcExecClose, lxcExecMessage, lxcExecOpen } from "./exec/lxc.ts";

export type WsKind = "exec-docker" | "exec-lxc" | "events";

export type WsData = {
  kind: WsKind;
  target: string;
  cmd: string[];
  cols: number;
  rows: number;
  state?: unknown;
};

const parseQueryCmd = (raw: string | null): string[] => {
  if (!raw) return ["/bin/sh"];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string")) return parsed;
  } catch {}
  return [raw];
};

const parseDim = (raw: string | null, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const tryUpgrade = async (req: Request, server: any, secret: string): Promise<boolean> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Single multiplexed event stream — clients subscribe to topics over it.
  if (path === "/api/events") {
    if (!(await authorize(url, secret))) return false;
    const data: WsData = { kind: "events", target: "", cmd: [], cols: 0, rows: 0 };
    return server.upgrade(req, { data });
  }

  const match = path.match(/^\/api\/(containers|lxc)\/([^/]+)\/exec$/);
  if (!match) return false;

  const auth = await authorize(url, secret);
  if (!auth) {
    return false;
  }

  const [, kind, id] = match;
  const data: WsData = {
    kind: kind === "containers" ? "exec-docker" : "exec-lxc",
    target: decodeURIComponent(id!),
    cmd: parseQueryCmd(url.searchParams.get("cmd")),
    cols: parseDim(url.searchParams.get("cols"), 80),
    rows: parseDim(url.searchParams.get("rows"), 24),
  };

  return server.upgrade(req, { data });
};

export const websocket = {
  open: (ws: ServerWebSocket<WsData>) => {
    if (ws.data.kind === "events") return;
    if (ws.data.kind === "exec-docker") dockerExecOpen(ws);
    else lxcExecOpen(ws);
  },
  message: (ws: ServerWebSocket<WsData>, msg: string | Buffer) => {
    if (ws.data.kind === "events") return eventsMessage(ws, msg);
    if (ws.data.kind === "exec-docker") dockerExecMessage(ws, msg);
    else lxcExecMessage(ws, msg);
  },
  close: (ws: ServerWebSocket<WsData>) => {
    if (ws.data.kind === "events") return;
    if (ws.data.kind === "exec-docker") dockerExecClose(ws);
    else lxcExecClose(ws);
  },
};
