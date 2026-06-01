export type OllamaClient = {
  base: string;
  call: <T>(method: string, path: string, body?: unknown) => Promise<T>;
  raw: (method: string, path: string, body?: unknown) => Promise<Response>;
};

export type ClientOptions = {
  apiKey?: string;
};

export const createClient = (base: string = "http://localhost:11434", opts: ClientOptions = {}): OllamaClient => {
  const normalized = base.replace(/\/+$/, "");
  const authHeader: Record<string, string> = opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {};

  const raw = async (method: string, path: string, body?: unknown): Promise<Response> => {
    const headers: Record<string, string> = { ...authHeader };
    let init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init = { ...init, body: JSON.stringify(body) };
    }
    return fetch(`${normalized}${path}`, init);
  };

  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await raw(method, path, body);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ollama ${method} ${path} → ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as T;
  };

  return { base: normalized, call, raw };
};
