// Event topics clients can subscribe to over the /api/events websocket. Each
// maps to one snapshot (see snapshots.ts) whose payload is published verbatim
// to subscribers. Keep these strings in sync with apps/web/src/live/topics.ts.
export const TOPICS = [
  "host",
  "engine",
  "containers",
  "lxc",
  "images",
  "networks",
  "pools",
  "volumes",
  "domains",
  "routes",
  "nginx-sites",
  "users",
  "connections",
  "apps",
  "ollama:status",
  "ollama:models",
  "ollama:pulls",
] as const;

export type Topic = (typeof TOPICS)[number];

const set = new Set<string>(TOPICS);

export const isTopic = (t: string): t is Topic => set.has(t);
