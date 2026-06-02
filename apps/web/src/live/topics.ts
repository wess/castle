import type { QueryKey } from "@tanstack/react-query";

// Topic -> the React Query key its pushed snapshot is written into. Mirror of
// the server's apps/server/src/events/topics.ts; the payload shape matches each
// query's queryFn return (the server already unwraps where the client does).
export const TOPIC_KEYS = {
  host: ["host"],
  engine: ["engine"],
  containers: ["containers"],
  lxc: ["lxc"],
  images: ["images"],
  networks: ["networks"],
  pools: ["pools"],
  volumes: ["volumes"],
  domains: ["domains"],
  routes: ["routes"],
  "nginx-sites": ["nginx-sites"],
  users: ["users"],
  connections: ["connections"],
  apps: ["apps", "installed"],
  "ollama:status": ["ollama", "status"],
  "ollama:models": ["ollama", "models"],
  "ollama:pulls": ["ollama", "pulls"],
} satisfies Record<string, QueryKey>;

export type Topic = keyof typeof TOPIC_KEYS;

export const isTopic = (t: string): t is Topic => t in TOPIC_KEYS;
