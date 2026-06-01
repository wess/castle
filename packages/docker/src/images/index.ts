import type { DockerClient } from "../client.ts";
import type { RawImage } from "../types.ts";

export const list = (client: DockerClient): Promise<RawImage[]> => client.call<RawImage[]>("GET", "/images/json");

type PullEvent = {
  status?: string;
  error?: string;
  errorDetail?: { message?: string };
  progressDetail?: { current?: number; total?: number };
};

export const pull = async (client: DockerClient, ref: string): Promise<void> => {
  const res = await client.raw("POST", `/images/create?fromImage=${encodeURIComponent(ref)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`pull ${ref} → ${res.status}: ${text || res.statusText}`);
  }
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      nl = buf.indexOf("\n");
      if (!line) continue;
      try {
        const evt = JSON.parse(line) as PullEvent;
        const errMsg = evt.error ?? evt.errorDetail?.message;
        if (errMsg) {
          reader.cancel().catch(() => {});
          throw new Error(`pull ${ref}: ${errMsg}`);
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("pull ")) throw err;
        // non-JSON line, ignore
      }
    }
  }
};

export const remove = (client: DockerClient, ref: string, force = false): Promise<void> =>
  client.call("DELETE", `/images/${encodeURIComponent(ref)}?force=${force ? 1 : 0}`);
