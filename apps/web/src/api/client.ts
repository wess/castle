import { clearToken, getToken } from "../auth/storage.ts";

const base = "/api";

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired. Please sign in again.");
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const extractMessage = (status: number, text: string): { message: string; body: unknown } => {
  if (!text) return { message: `Request failed (HTTP ${status})`, body: null };
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    const msg = parsed.error ?? parsed.message;
    if (msg) return { message: msg, body: parsed };
    return { message: text, body: parsed };
  } catch {
    // Strip HTML if a proxy returned an error page
    const stripped = text.replace(/<[^>]+>/g, "").trim();
    return { message: stripped || `Request failed (HTTP ${status})`, body: text };
  }
};

export const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("castle:auth-expired"));
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const { message, body } = extractMessage(res.status, text);
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
};

export const errorMessage = (e: unknown): string => {
  if (e instanceof ApiError) return e.message;
  if (e instanceof UnauthorizedError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
};

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
export const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const streamLines = async function* (path: string): AsyncGenerator<string> {
  const token = getToken();
  const res = await fetch(`${base}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("castle:auth-expired"));
    throw new UnauthorizedError();
  }
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer) yield buffer;
      break;
    }
    buffer += value;
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      yield buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
    }
  }
};
