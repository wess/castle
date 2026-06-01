// HTTP-based provisioner. Castle no longer pokes the app's database directly;
// instead it calls /api/castle/* on each user-aware app instance. Connections
// (hostname + bearer token) live in the `app_connections` table — populated
// by the Apps install flow for Castle-managed instances, and manually by the
// admin for external/pre-existing instances.

import { store as connectionsStore } from "../connections/index.ts";
import type { AppConnection } from "../connections/types.ts";
import type { Db } from "../db/index.ts";
import { recordProvision } from "./store.ts";
import type { User } from "./types.ts";

const REQUEST_TIMEOUT_MS = 15_000;

type CastleResponse = { error?: string; id?: number; created?: boolean; revoked_sessions?: number };

const baseUrl = (hostname: string): string => {
  if (/^https?:\/\//i.test(hostname)) return hostname.replace(/\/+$/, "");
  return `http://${hostname}`.replace(/\/+$/, "");
};

const callJson = async (
  method: "GET" | "POST" | "DELETE",
  url: string,
  token: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: CastleResponse | null; error: string | null }> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: CastleResponse | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as CastleResponse;
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const msg = data?.error ?? text.trim() ?? `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: msg || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, error: msg };
  } finally {
    clearTimeout(timer);
  }
};

export type ProvisionResult = {
  appId: string;
  instance: string;
  ok: boolean;
  error: string | null;
};

type ProvisionInput = {
  email: string;
  username: string;
  name: string;
  passwordHash: string;
};

const provisionOne = async (
  conn: AppConnection,
  input: ProvisionInput,
): Promise<{ ok: boolean; error: string | null }> => {
  const res = await callJson("POST", `${baseUrl(conn.hostname)}/api/castle/users`, conn.token, {
    email: input.email,
    username: input.username,
    name: input.name,
    password_hash: input.passwordHash,
  });
  return { ok: res.ok, error: res.error };
};

export const provisionUser = async (db: Db, user: User, passwordHash: string): Promise<ProvisionResult[]> => {
  const connections = await connectionsStore.list(db);
  const results: ProvisionResult[] = [];
  for (const conn of connections) {
    const r = await provisionOne(conn, {
      email: user.email,
      username: user.username,
      name: user.name,
      passwordHash,
    });
    results.push({ appId: conn.appId, instance: conn.instance, ...r });
    await recordProvision(db, {
      user_id: user.id,
      app_id: conn.appId,
      instance: conn.instance,
      status: r.ok ? "ok" : "error",
      error: r.error,
    });
  }
  return results;
};

export const deprovisionUser = async (db: Db, email: string): Promise<ProvisionResult[]> => {
  const connections = await connectionsStore.list(db);
  const results: ProvisionResult[] = [];
  for (const conn of connections) {
    const res = await callJson(
      "DELETE",
      `${baseUrl(conn.hostname)}/api/castle/users/by-email/${encodeURIComponent(email)}`,
      conn.token,
    );
    // 404 is a successful no-op: the user already isn't there.
    const ok = res.ok || res.status === 404;
    results.push({
      appId: conn.appId,
      instance: conn.instance,
      ok,
      error: ok ? null : res.error,
    });
  }
  return results;
};

export const provisionAllUsersToConnection = async (db: Db, conn: AppConnection): Promise<void> => {
  const rows = (await db`SELECT id, email, username, name, password FROM users`) as Array<{
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    password: string;
  }>;
  for (const r of rows) {
    const res = await provisionOne(conn, {
      email: r.email,
      username: r.username ?? r.email.split("@")[0] ?? "user",
      name: r.name ?? r.email.split("@")[0] ?? "User",
      passwordHash: r.password,
    });
    await recordProvision(db, {
      user_id: r.id,
      app_id: conn.appId,
      instance: conn.instance,
      status: res.ok ? "ok" : "error",
      error: res.error,
    });
  }
};

export const checkConnectionHealth = async (conn: AppConnection): Promise<{ ok: boolean; error: string | null }> => {
  const res = await callJson("GET", `${baseUrl(conn.hostname)}/api/castle/health`, conn.token);
  return { ok: res.ok, error: res.error };
};
