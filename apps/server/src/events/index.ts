import { type Broadcaster, setServer } from "./hub.ts";
import { startDockerProducer } from "./producers/docker.ts";
import { startSampler } from "./producers/sampler.ts";

export { eventsMessage } from "./socket.ts";

// Wire the event engine to the running server: capture the ref for broadcasts,
// then start the Docker event tail and the periodic sampler.
export const startEvents = (server: Broadcaster): (() => void) => {
  setServer(server);
  const stopDocker = startDockerProducer();
  const stopSampler = startSampler();
  return () => {
    stopDocker();
    stopSampler();
  };
};
