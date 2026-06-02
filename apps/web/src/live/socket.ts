import type { QueryClient } from "@tanstack/react-query";
import { isTopic, TOPIC_KEYS, type Topic } from "./topics.ts";

// Single multiplexed websocket to /api/events. A module singleton (not React
// state) so topic subscriptions survive re-renders and route changes. Pushed
// snapshots are written straight into the query cache — no refetch.

let qc: QueryClient | null = null;
let ws: WebSocket | null = null;
let enabled = false;
let token: string | null = null;
let connected = false;
let backoff = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const counts = new Map<Topic, number>();
const statusListeners = new Set<() => void>();

const notify = (): void => {
  for (const l of statusListeners) l();
};

const setConnected = (v: boolean): void => {
  if (connected === v) return;
  connected = v;
  notify();
};

const send = (obj: unknown): void => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
};

const activeTopics = (): Topic[] => [...counts.entries()].filter(([, n]) => n > 0).map(([t]) => t);

const clearReconnect = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = (): void => {
  if (reconnectTimer || !enabled) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, backoff);
  backoff = Math.min(backoff * 2, 15_000);
};

const open = (): void => {
  if (!enabled || ws) return;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const sock = new WebSocket(`${proto}//${location.host}/api/events${qs}`);
  ws = sock;

  sock.onopen = () => {
    backoff = 1000;
    setConnected(true);
    const topics = activeTopics();
    if (topics.length) send({ action: "subscribe", topics });
  };

  sock.onmessage = (e) => {
    if (!qc) return;
    let msg: { topic?: string; data?: unknown };
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (typeof msg.topic !== "string" || !isTopic(msg.topic) || msg.data === undefined) return;
    qc.setQueryData(TOPIC_KEYS[msg.topic], msg.data);
  };

  sock.onclose = () => {
    if (ws === sock) ws = null;
    setConnected(false);
    scheduleReconnect();
  };

  sock.onerror = () => {
    try {
      sock.close();
    } catch {}
  };
};

const teardown = (): void => {
  clearReconnect();
  const sock = ws;
  ws = null;
  if (sock) {
    sock.onclose = null;
    sock.onerror = null;
    try {
      sock.close();
    } catch {}
  }
  setConnected(false);
};

// Called by <LiveProvider> on mount and whenever the session/token changes.
export const configure = (client: QueryClient, on: boolean, tok: string | null): void => {
  qc = client;
  if (on === enabled && tok === token) return;
  enabled = on;
  token = tok;
  teardown();
  backoff = 1000;
  if (enabled) open();
};

export const subscribe = (topic: Topic): void => {
  const n = (counts.get(topic) ?? 0) + 1;
  counts.set(topic, n);
  if (n === 1) send({ action: "subscribe", topics: [topic] });
};

export const unsubscribe = (topic: Topic): void => {
  const n = (counts.get(topic) ?? 0) - 1;
  if (n <= 0) {
    counts.delete(topic);
    send({ action: "unsubscribe", topics: [topic] });
  } else {
    counts.set(topic, n);
  }
};

export const isConnected = (): boolean => connected;

export const onStatus = (cb: () => void): (() => void) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};
