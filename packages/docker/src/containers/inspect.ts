import type { DockerClient } from "../client.ts";
import type { RawContainerInspect } from "../types.ts";

export const inspect = (client: DockerClient, id: string): Promise<RawContainerInspect> =>
  client.call<RawContainerInspect>("GET", `/containers/${encodeURIComponent(id)}/json`);
