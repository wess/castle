import { del, get, halt, json, pipe, post } from "@atlas/server";
import { store as connectionsStore } from "../connections/index.ts";
import { app } from "../state.ts";
import { checkConnectionHealth, provisionAllUsersToConnection } from "../users/provision.ts";

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const APP_IDS = new Set(["tangle", "stohr"]);
const HOST_RE = /^[a-z0-9][a-z0-9.-]*(:\d{1,5})?$/i;

const idOf = (c: { params: Record<string, string | undefined> }): number | null => {
  const raw = c.params.id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const connectionsRoutes = [
  get(
    "/api/connections",
    pipe(async (c) => {
      const rows = await connectionsStore.list(app().db);
      // Strip tokens — never echo them back over the wire after creation.
      const safe = rows.map(({ token: _t, ...rest }) => rest);
      return json(c, 200, { connections: safe });
    }),
  ),

  post(
    "/api/connections",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const appId = (body.appId as string | undefined)?.trim();
      const instance = (body.instance as string | undefined)?.trim();
      const hostnameRaw = (body.hostname as string | undefined)?.trim().toLowerCase();
      const token = (body.token as string | undefined)?.trim();
      if (!appId || !APP_IDS.has(appId)) {
        return halt(c, 422, { error: "appId must be tangle or stohr" });
      }
      if (!instance) return halt(c, 422, { error: "instance required" });
      if (!hostnameRaw || !HOST_RE.test(hostnameRaw)) {
        return halt(c, 422, { error: "hostname must be a valid host[:port]" });
      }
      if (!token || token.length < 16) {
        return halt(c, 422, { error: "token must be at least 16 chars" });
      }
      const conn = await connectionsStore.upsert(app().db, {
        appId: appId as "tangle" | "stohr",
        instance,
        hostname: hostnameRaw,
        token,
        managed: false,
      });
      (async () => {
        try {
          await provisionAllUsersToConnection(app().db, conn);
        } catch {}
      })();
      const { token: _t, ...safe } = conn;
      return json(c, 201, { connection: safe });
    }),
  ),

  post(
    "/api/connections/:id/check",
    pipe(async (c) => {
      const id = idOf(c);
      if (id === null) return halt(c, 422, { error: "invalid id" });
      const all = await connectionsStore.list(app().db);
      const conn = all.find((x) => x.id === id);
      if (!conn) return halt(c, 404, { error: "connection not found" });
      const res = await checkConnectionHealth(conn);
      return json(c, 200, { ok: res.ok, error: res.error });
    }),
  ),

  del(
    "/api/connections/:id",
    pipe(async (c) => {
      const id = idOf(c);
      if (id === null) return halt(c, 422, { error: "invalid id" });
      await connectionsStore.remove(app().db, id);
      return json(c, 200, { ok: true, deleted: id });
    }),
  ),
];
