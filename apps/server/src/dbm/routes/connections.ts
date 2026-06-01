import { del, get, halt, json, pipe, post, put } from "@atlas/server";
import { app } from "../../state.ts";
import { type ConnectionConfig, createAdapter } from "../adapters/index.ts";
import * as pool from "../pool.ts";
import * as store from "../store.ts";

const requireId = (id?: string) => {
  if (!id) throw new Error("id required");
  return id;
};

export const connectionRoutes = [
  get(
    "/api/dbm/connections",
    pipe(async (c) => json(c, 200, await store.list(app().db))),
  ),

  post(
    "/api/dbm/connections",
    pipe(async (c) => {
      const body = (await c.request.json()) as Parameters<typeof store.save>[1];
      const saved = await store.save(app().db, body);
      return json(c, 201, saved);
    }),
  ),

  put(
    "/api/dbm/connections/:id",
    pipe(async (c) => {
      const body = (await c.request.json()) as Parameters<typeof store.save>[1];
      const saved = await store.save(app().db, { ...body, id: requireId(c.params.id) });
      return json(c, 200, saved);
    }),
  ),

  del(
    "/api/dbm/connections/:id",
    pipe(async (c) => {
      const id = requireId(c.params.id);
      await pool.close(id).catch(() => {});
      await store.remove(app().db, id);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/dbm/connections/test",
    pipe(async (c) => {
      const cfg = (await c.request.json()) as ConnectionConfig;
      try {
        const adapter = createAdapter({ ...cfg, id: cfg.id || "test" });
        await adapter.connect();
        const version = await adapter.getVersion().catch(() => "unknown");
        await adapter.disconnect();
        return json(c, 200, { ok: true, version });
      } catch (e) {
        return json(c, 200, { ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }),
  ),

  post(
    "/api/dbm/connections/:id/connect",
    pipe(async (c) => {
      const cid = requireId(c.params.id);
      const conn = await store.get(app().db, cid);
      if (!conn) return halt(c, 404, { error: "not found" });
      await pool.open(conn);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/dbm/connections/:id/disconnect",
    pipe(async (c) => {
      await pool.close(requireId(c.params.id));
      return json(c, 200, { ok: true });
    }),
  ),

  get(
    "/api/dbm/connections/:id/databases",
    pipe(async (c) => {
      const cid = requireId(c.params.id);
      if (!pool.isOpen(cid)) {
        const conn = await store.get(app().db, cid);
        if (!conn) return halt(c, 404, { error: "not found" });
        await pool.open(conn);
      }
      const names = await pool.get(cid).getDatabases();
      return json(c, 200, names);
    }),
  ),

  post(
    "/api/dbm/connections/:id/database",
    pipe(async (c) => {
      const cid = requireId(c.params.id);
      const body = (await c.request.json().catch(() => ({}))) as { database?: string };
      if (!body.database) return halt(c, 422, { error: "database required" });
      const conn = await store.get(app().db, cid);
      if (!conn) return halt(c, 404, { error: "not found" });
      // Close live adapter, persist the new database name, reopen.
      await pool.close(cid).catch(() => {});
      const updated = await store.save(app().db, { ...conn, id: cid, database: body.database });
      await pool.open(updated);
      return json(c, 200, { ok: true, database: body.database });
    }),
  ),
];
