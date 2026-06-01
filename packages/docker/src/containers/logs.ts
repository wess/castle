import type { DockerClient } from "../client.ts";

export type LogsOptions = {
  follow?: boolean;
  tail?: number | "all";
  timestamps?: boolean;
  stdout?: boolean;
  stderr?: boolean;
};

export const logs = async (
  client: DockerClient,
  id: string,
  opts: LogsOptions = {},
): Promise<ReadableStream<Uint8Array>> => {
  const params = new URLSearchParams({
    stdout: String(opts.stdout ?? true),
    stderr: String(opts.stderr ?? true),
    follow: String(opts.follow ?? false),
    timestamps: String(opts.timestamps ?? false),
    tail: opts.tail === undefined ? "all" : String(opts.tail),
  });
  const res = await client.raw("GET", `/containers/${encodeURIComponent(id)}/logs?${params}`);
  if (!res.ok || !res.body) throw new Error(`logs ${id} → ${res.status}`);
  return res.body;
};
