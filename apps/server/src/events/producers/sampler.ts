import { publishTopic } from "../refresh.ts";
import type { Topic } from "../topics.ts";

// Topics with no push source of their own (proc stats, LXC, df, ollama). One
// shared ticker samples them for all clients; publishTopic no-ops when nobody's
// subscribed, so an idle/unwatched resource costs nothing.
const FAST: Topic[] = ["host", "lxc", "ollama:status", "ollama:pulls"];
const SLOW: Topic[] = [
  "engine",
  "pools",
  "domains",
  "routes",
  "nginx-sites",
  "users",
  "connections",
  "ollama:models",
  "containers", // safety net behind the docker event producer
];

const BASE_MS = 2500;
const SLOW_EVERY = 4; // ~10s

export const startSampler = (): (() => void) => {
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    for (const t of FAST) void publishTopic(t);
    if (tick % SLOW_EVERY === 0) for (const t of SLOW) void publishTopic(t);
  }, BASE_MS);
  return () => clearInterval(timer);
};
