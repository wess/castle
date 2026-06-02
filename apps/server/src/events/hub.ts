import type { Topic } from "./topics.ts";

// Just the pub/sub surface of Bun's Server — structural so we dodge the generic
// `Server<WebSocketData>` type argument and its invariance.
export type Broadcaster = {
  publish: (topic: string, data: string) => unknown;
  subscriberCount: (topic: string) => number;
};

// Thin wrapper over Bun's native websocket pub/sub. The server ref is captured
// at startup (Bun.serve returns it) so producers can broadcast without a socket.
let server: Broadcaster | null = null;

export const setServer = (s: Broadcaster): void => {
  server = s;
};

export const hasSubscribers = (topic: Topic): boolean => (server?.subscriberCount(topic) ?? 0) > 0;

export const publish = (topic: Topic, data: unknown): void => {
  server?.publish(topic, JSON.stringify({ topic, data }));
};
