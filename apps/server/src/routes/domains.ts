import { del, get, halt, json, pipe, post } from "@atlas/server";
import { reload, store } from "../domains/index.ts";

const safeReload = async (): Promise<{ reloaded: boolean; error?: string }> => {
  try {
    await reload();
    return { reloaded: true };
  } catch (err) {
    return { reloaded: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const domainRoutes = [
  get(
    "/api/domains",
    pipe(async (c) => {
      const entries = await store.list();
      return json(c, 200, { entries });
    }),
  ),

  post(
    "/api/domains",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as { name?: string };
      if (!body.name) return halt(c, 422, { error: "name required" });
      try {
        const entries = await store.add(body.name);
        const r = await safeReload();
        return json(c, 201, { entries, ...r });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  del(
    "/api/domains/:name",
    pipe(async (c) => {
      const decoded = decodeURIComponent(c.params.name!);
      try {
        const entries = await store.remove(decoded);
        const r = await safeReload();
        return json(c, 200, { entries, ...r });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/domains/reload",
    pipe(async (c) => {
      const r = await safeReload();
      return json(c, r.reloaded ? 200 : 500, r);
    }),
  ),
];
