const base = Bun.env.CASTLE_URL ?? "http://localhost:4280";

export const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as T;
};

export const stream = async (path: string): Promise<ReadableStream<Uint8Array>> => {
  const res = await fetch(`${base}/api${path}`);
  if (!res.ok || !res.body) throw new Error(`GET ${path} → ${res.status}`);
  return res.body;
};
