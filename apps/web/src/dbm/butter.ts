// IPC shim — replaces Ambry's `butter` runtime with Castle REST calls.
// Each Ambry IPC action maps to one or more fetch() calls against /api/dbm/*.

import { getToken } from "../auth/storage.ts";
import { type ExportFormat, mimeFor, serialize } from "./export.ts";

const base = "/api";

const auth = (): Record<string, string> => {
  const t = getToken();
  return t ? { authorization: `Bearer ${t}` } : {};
};

const req = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...auth() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event("castle:auth-expired"));
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("application/json") ? await res.json() : await res.text()) as T;
};

const idFromHash = (): string | null => {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#\/connection\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
};

let activeConnectionId: string | null = null;

const resolveId = (provided?: string | null): string => {
  const fromArg = typeof provided === "string" && provided.length > 0 ? provided : null;
  const resolved = fromArg ?? activeConnectionId ?? idFromHash();
  if (!resolved) throw new Error("no active connection");
  activeConnectionId = resolved;
  return resolved;
};

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

// Browser export: pull rows via the existing query endpoint, serialize locally,
// and trigger a blob download. Native file dialogs aren't available in the SPA.
const exportFile = async (data: {
  table: string;
  format: ExportFormat;
  includeHeaders?: boolean;
  allRows?: boolean;
}): Promise<null> => {
  if (typeof document === "undefined") return null;
  const cid = resolveId();
  const limit = data.allRows === false ? " LIMIT 1000" : "";
  const result = await req<{ columns: string[]; rows: Record<string, unknown>[] }>(
    "POST",
    `/dbm/connections/${cid}/query`,
    { sql: `SELECT * FROM ${quoteIdent(data.table)}${limit}` },
  );
  const content = serialize(data.format, data.table, result.columns, result.rows, data.includeHeaders !== false);
  const blob = new Blob([content], { type: mimeFor(data.format) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.table}.${data.format}`;
  a.click();
  URL.revokeObjectURL(url);
  return null;
};

type Handler = (data: unknown) => Promise<unknown>;

const asRecord = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" ? (data as Record<string, unknown>) : {};

const asString = (data: unknown): string => (typeof data === "string" ? data : "");

const tablePath = (data: unknown, suffix: string): string =>
  `/dbm/connections/${resolveId()}/tables/${encodeURIComponent(asString(asRecord(data).table))}/${suffix}`;

const handlers: Record<string, Handler> = {
  "connection:list": () => req("GET", "/dbm/connections"),
  "connection:save": (data) => {
    const d = asRecord(data);
    return req(d.id ? "PUT" : "POST", d.id ? `/dbm/connections/${d.id}` : "/dbm/connections", data);
  },
  "connection:delete": (data) => req("DELETE", `/dbm/connections/${asString(data)}`).then(() => true),
  "connection:test": (data) => req("POST", "/dbm/connections/test", data),
  "connection:connect": async (data) => {
    const cid = resolveId(asString(data) || null);
    await req("POST", `/dbm/connections/${cid}/connect`);
    return true;
  },
  "connection:disconnect": async (data) => {
    const cid = resolveId(asString(data) || null);
    await req("POST", `/dbm/connections/${cid}/disconnect`);
    if (activeConnectionId === cid) activeConnectionId = null;
    return true;
  },
  "tables:list": (data) => req("GET", `/dbm/connections/${resolveId(asString(data) || null)}/tables`),
  "table:structure": (data) => req("GET", tablePath(data, "structure")),
  "table:ddl": (data) => req<{ ddl: string }>("GET", tablePath(data, "ddl")).then((r) => r.ddl),
  "table:rows": (data) => req("POST", tablePath(data, "rows"), data),
  "row:insert": (data) => req("POST", tablePath(data, "insert"), { row: asRecord(data).row }).then(() => true),
  "row:update": (data) => {
    const d = asRecord(data);
    return req("PUT", tablePath(data, "update"), { primaryKey: d.primaryKey, changes: d.changes }).then(() => true);
  },
  "row:delete": (data) =>
    req("DELETE", tablePath(data, "delete"), { primaryKey: asRecord(data).primaryKey }).then(() => true),
  "query:execute": (data) =>
    req("POST", `/dbm/connections/${resolveId()}/query`, { sql: asString(asRecord(data).sql) }),
  "query:execute:multi": (data) =>
    req("POST", `/dbm/connections/${resolveId()}/query/multi`, { sql: asString(asRecord(data).sql) }),
  "query:history": () => req("GET", "/dbm/history"),
  "favorites:list": () => req("GET", "/dbm/favorites"),
  "favorites:save": (data) => req("POST", "/dbm/favorites", data),
  "favorites:delete": (data) => req("DELETE", `/dbm/favorites/${asString(data)}`).then(() => true),
  "databases:list": (data) => req("GET", `/dbm/connections/${resolveId(asString(data) || null)}/databases`),
  "database:switch": async (data) => {
    const d = asRecord(data);
    const cid = resolveId(asString(d.connectionId) || null);
    await req("POST", `/dbm/connections/${cid}/database`, { database: d.database });
    activeConnectionId = cid;
    return true;
  },
  "tabs:load": () => req("GET", "/dbm/tabs"),
  "tabs:save": (data) => req("POST", "/dbm/tabs", data).then(() => true),
  "settings:load": () => req("GET", "/dbm/settings"),
  "settings:save": (data) => req("POST", "/dbm/settings", data).then(() => true),
  "table:profile": (data) => req("POST", tablePath(data, "profile"), data),
  "schema:compare": (data) => req("POST", "/dbm/schema/compare", data),
  "export:file": (data) => exportFile(asRecord(data) as unknown as Parameters<typeof exportFile>[0]),
  "macros:list": () => req("GET", "/dbm/macros"),
  "macros:save": (data) => req("POST", "/dbm/macros", data),
  "macros:delete": (data) => req("DELETE", `/dbm/macros/${asString(data)}`).then(() => true),

  // Native-only / out-of-scope for the 1.0 web build. Their UI entry points are
  // gated, but if one is reached these degrade gracefully instead of throwing.
  "file:read": () => unavailable("file:read"),
  "import:sql": () => Promise.resolve({ success: false, error: "SQL file import is not available in the web build" }),
  "import:csv": () => Promise.resolve({ inserted: 0, total: 0, error: "CSV import is not available in the web build" }),
  "import:csvfile": () =>
    Promise.resolve({ inserted: 0, total: 0, error: "CSV file import is not available in the web build" }),
  "table:mockdata": () =>
    Promise.resolve({ inserted: 0, error: "Mock data generation is not available in the web build" }),
  "macros:export": () => unavailable("macros:export"),
  "macros:import": () => Promise.resolve([]),
  "plugins:list": () => Promise.resolve([]),
  "plugins:registry": () => Promise.resolve([]),
  "plugins:install": () => unavailable("plugins:install"),
  "plugins:uninstall": () => unavailable("plugins:uninstall"),
  "plugins:toggle": () => unavailable("plugins:toggle"),
};

const unavailable = (action: string): Promise<null> => {
  console.warn(`[dbm] action not available in web build: ${action}`);
  return Promise.resolve(null);
};

export const invoke = async <T = unknown>(action: string, data?: unknown, _opts?: { timeout?: number }): Promise<T> => {
  const handler = handlers[action];
  if (!handler) {
    console.warn(`[dbm] unknown IPC action: ${action}`);
    return null as T;
  }
  return (await handler(data)) as T;
};

type EventHandler = (data: unknown) => void;
const listeners: Record<string, Set<EventHandler>> = {};

export const listen = (action: string, handler: EventHandler) => {
  if (!listeners[action]) listeners[action] = new Set();
  listeners[action]!.add(handler);
};

export const unlisten = (action: string, handler: EventHandler) => {
  listeners[action]?.delete(handler);
};

// Mount as global so any legacy `butter.invoke(...)` calls inside the ported
// components keep working without rewriting them.
if (typeof window !== "undefined") {
  (window as unknown as { butter: unknown }).butter = {
    invoke,
    on: listen,
    off: unlisten,
  };

  // Keep activeConnectionId in lockstep with the route hash so reloads /
  // direct visits to /databases#/connection/<id> work without a connect
  // round-trip first.
  const sync = () => {
    const id = idFromHash();
    if (id) activeConnectionId = id;
  };
  sync();
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
}

export const setActiveConnection = (id: string | null) => {
  activeConnectionId = id;
};

export const getActiveConnection = (): string | null => activeConnectionId;
