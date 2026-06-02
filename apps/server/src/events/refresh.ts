import { hasSubscribers, publish } from "./hub.ts";
import { SNAPSHOTS } from "./snapshots.ts";
import type { Topic } from "./topics.ts";

// Compute and broadcast a topic's snapshot — but only if someone is listening,
// so an idle daemon does no work. Errors are swallowed: a failed snapshot just
// skips this round rather than killing the producer loop.
export const publishTopic = async (topic: Topic): Promise<void> => {
  if (!hasSubscribers(topic)) return;
  try {
    publish(topic, await SNAPSHOTS[topic]());
  } catch {
    // transient (docker/ollama unreachable, etc.) — next tick retries
  }
};
