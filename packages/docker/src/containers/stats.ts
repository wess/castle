import type { DockerClient } from "../client.ts";

export const stats = async (
  client: DockerClient,
  id: string,
  stream = false,
): Promise<ReadableStream<Uint8Array> | unknown> => {
  if (stream) {
    const res = await client.raw("GET", `/containers/${encodeURIComponent(id)}/stats?stream=1`);
    if (!res.ok || !res.body) throw new Error(`stats ${id} → ${res.status}`);
    return res.body;
  }
  return client.call("GET", `/containers/${encodeURIComponent(id)}/stats?stream=0`);
};
