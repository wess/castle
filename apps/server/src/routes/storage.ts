import { del, get, json, pipe, post } from "@atlas/server";
import { volumes } from "@castle/docker";
import { pools as registry } from "../db/index.ts";
import { app } from "../state.ts";
import { collectPools, resolveDir } from "../storage/index.ts";

// Pool names map 1:1 to a `dir:<name>` id and show in the UI, so keep them tame.
const NAME_RE = /^[a-z0-9][a-z0-9.-]*$/i;

export const storageRoutes = [
  get(
    "/api/storage/pools",
    pipe(async (c) => json(c, 200, await collectPools(app().db))),
  ),

  post(
    "/api/storage/pools",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as { name?: unknown; path?: unknown };
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const path = typeof body.path === "string" ? body.path.trim() : "";
      if (!NAME_RE.test(name)) return json(c, 400, { error: "invalid pool name" });
      if (!path.startsWith("/")) return json(c, 400, { error: "path must be absolute" });
      await registry.add(app().db, name, path);
      return json(c, 201, await resolveDir(name, path));
    }),
  ),

  del(
    "/api/storage/pools/:name",
    pipe(async (c) => {
      await registry.remove(app().db, `dir:${c.params.name!}`);
      return json(c, 200, { ok: true });
    }),
  ),

  get(
    "/api/storage/volumes",
    pipe(async (c) => json(c, 200, await volumes.list(app().docker))),
  ),

  post(
    "/api/storage/volumes",
    pipe(async (c) => {
      const body = (await c.request.json()) as { name: string };
      const v = await volumes.create(app().docker, body.name);
      return json(c, 201, v);
    }),
  ),

  del(
    "/api/storage/volumes/:name",
    pipe(async (c) => {
      const url = new URL(c.request.url);
      const force = url.searchParams.get("force") === "1";
      await volumes.remove(app().docker, c.params.name!, force);
      return json(c, 200, { ok: true });
    }),
  ),
];
