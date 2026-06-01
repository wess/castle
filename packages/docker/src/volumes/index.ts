import type { DockerClient } from "../client.ts";
import type { RawVolume } from "../types.ts";

export const list = async (client: DockerClient): Promise<RawVolume[]> => {
  const res = await client.call<{ Volumes: RawVolume[] | null }>("GET", "/volumes");
  return res.Volumes ?? [];
};

export const create = (client: DockerClient, name: string): Promise<RawVolume> =>
  client.call<RawVolume>("POST", "/volumes/create", { Name: name });

export const remove = (client: DockerClient, name: string, force = false): Promise<void> =>
  client.call("DELETE", `/volumes/${encodeURIComponent(name)}?force=${force ? 1 : 0}`);
