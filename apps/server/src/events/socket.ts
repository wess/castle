import { isTopic } from "./topics.ts";

// The events socket carries no per-connection state: Bun tracks topic
// membership itself and auto-unsubscribes on close. Clients drive it with
// `{ action: "subscribe" | "unsubscribe", topics: string[] }`.
type Incoming = { action?: unknown; topics?: unknown };

// Only the pub/sub surface is needed — structural so any ServerWebSocket fits.
type Subscribable = { subscribe: (topic: string) => void; unsubscribe: (topic: string) => void };

export const eventsMessage = (ws: Subscribable, raw: string | Buffer): void => {
  let msg: Incoming;
  try {
    msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
  } catch {
    return;
  }
  if (msg.action !== "subscribe" && msg.action !== "unsubscribe") return;
  const topics = Array.isArray(msg.topics) ? msg.topics : [];
  for (const t of topics) {
    if (typeof t !== "string" || !isTopic(t)) continue;
    if (msg.action === "subscribe") ws.subscribe(t);
    else ws.unsubscribe(t);
  }
};
