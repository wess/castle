import { del, get, halt, json, pipe, post, put } from "@atlas/server";
import { store as domains, reload as reloadMdns } from "../domains/index.ts";
import { nginx, routes, sites } from "../hosts/index.ts";
import { app } from "../state.ts";
import { BACKEND_RE, ensureLocal, HOSTNAME_RE, parseLocations } from "./validate.ts";

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const reloadAll = async (): Promise<{ nginx: boolean; mdns: boolean; error?: string }> => {
  const errors: string[] = [];
  try {
    const all = await routes.list(app().db);
    await nginx.sync(all);
    await nginx.reload();
  } catch (err) {
    errors.push(`nginx: ${err instanceof Error ? err.message : String(err)}`);
  }
  let mdnsOk = true;
  try {
    await reloadMdns();
  } catch (err) {
    mdnsOk = false;
    errors.push(`mdns: ${err instanceof Error ? err.message : String(err)}`);
  }
  return {
    nginx: errors.every((e) => !e.startsWith("nginx")),
    mdns: mdnsOk,
    error: errors.join("; ") || undefined,
  };
};

export const routesRoutes = [
  get(
    "/api/routes",
    pipe(async (c) => json(c, 200, { routes: await routes.list(app().db) })),
  ),

  post(
    "/api/routes",
    pipe(async (c) => {
      const body = await readJson(c.request);
      try {
        const hostname = ensureLocal(String(body.hostname ?? ""));
        if (!HOSTNAME_RE.test(hostname)) return halt(c, 422, { error: "invalid hostname" });
        const backend = String(body.backend ?? "").trim();
        if (!BACKEND_RE.test(backend)) return halt(c, 422, { error: "backend must be host:port" });
        const websocket = body.websocket !== false;
        const locs = parseLocations(body.locations);
        if (!locs.ok) return halt(c, 422, { error: locs.error });
        const row = await routes.upsert(app().db, { hostname, backend, websocket, locations: locs.locations });
        await domains.add(hostname);
        const reload = await reloadAll();
        return json(c, 201, { route: row, ...reload });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  put(
    "/api/routes/:hostname",
    pipe(async (c) => {
      const body = await readJson(c.request);
      try {
        const hostname = decodeURIComponent(c.params.hostname!);
        const backend = String(body.backend ?? "").trim();
        if (!BACKEND_RE.test(backend)) return halt(c, 422, { error: "backend must be host:port" });
        const websocket = body.websocket !== false;
        const locs = parseLocations(body.locations);
        if (!locs.ok) return halt(c, 422, { error: locs.error });
        const row = await routes.upsert(app().db, { hostname, backend, websocket, locations: locs.locations });
        const reload = await reloadAll();
        return json(c, 200, { route: row, ...reload });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  del(
    "/api/routes/:hostname",
    pipe(async (c) => {
      try {
        const hostname = decodeURIComponent(c.params.hostname!);
        await routes.remove(app().db, hostname);
        await domains.remove(hostname).catch(() => {});
        const reload = await reloadAll();
        return json(c, 200, { ok: true, ...reload });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  get(
    "/api/nginx/sites",
    pipe(async (c) => json(c, 200, { sites: await sites.list() })),
  ),

  get(
    "/api/nginx/sites/:name",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      try {
        const raw = await sites.read(name);
        return json(c, 200, { name, raw });
      } catch (err) {
        return halt(c, 404, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/nginx/sites/:name/enable",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      try {
        await sites.enable(name);
        await nginx.reload();
        return json(c, 200, { ok: true });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/nginx/sites/:name/disable",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      try {
        await sites.disable(name);
        await nginx.reload();
        return json(c, 200, { ok: true });
      } catch (err) {
        return halt(c, 422, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),
];
