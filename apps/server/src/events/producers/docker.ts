import { app } from "../../state.ts";
import { publishTopic } from "../refresh.ts";
import type { Topic } from "../topics.ts";

// Docker engine event Type -> the topics whose snapshot it invalidates.
// Container churn also moves the Apps view (instances are derived from containers).
const TYPE_TOPICS: Record<string, Topic[]> = {
  container: ["containers", "apps"],
  image: ["images"],
  network: ["networks"],
  volume: ["volumes"],
};

// Tails the Docker `/events` stream and refreshes affected topics. Coalesces
// bursts (a `docker compose up` fires many events) into one publish per topic.
export const startDockerProducer = (): (() => void) => {
  let stopped = false;
  const pending = new Map<Topic, ReturnType<typeof setTimeout>>();

  const schedule = (topic: Topic): void => {
    clearTimeout(pending.get(topic));
    pending.set(
      topic,
      setTimeout(() => {
        pending.delete(topic);
        void publishTopic(topic);
      }, 250),
    );
  };

  const run = async (): Promise<void> => {
    while (!stopped) {
      try {
        const res = await app().docker.raw("GET", "/events");
        if (!res.body) throw new Error("docker /events: no body");
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          let nl = buffer.indexOf("\n");
          while (nl >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            nl = buffer.indexOf("\n");
            if (!line) continue;
            try {
              const evt = JSON.parse(line) as { Type?: string };
              const topics = evt.Type ? TYPE_TOPICS[evt.Type] : undefined;
              if (topics) for (const t of topics) schedule(t);
            } catch {}
          }
        }
      } catch {
        // socket down or stream closed — reconnect after a short backoff
      }
      if (!stopped) await Bun.sleep(2000);
    }
  };

  void run();
  return () => {
    stopped = true;
  };
};
