import { del, get, json, pipe, post } from "@atlas/server";
import { images } from "@castle/docker";
import { app } from "../state.ts";

export const imageRoutes = [
  get(
    "/api/images",
    pipe(async (c) => json(c, 200, await images.list(app().docker))),
  ),

  post(
    "/api/images/pull",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as { ref?: string };
      if (!body.ref) return json(c, 400, { error: "ref required" });
      await images.pull(app().docker, body.ref);
      return json(c, 200, { ok: true });
    }),
  ),

  del(
    "/api/images/:ref",
    pipe(async (c) => {
      const url = new URL(c.request.url);
      const force = url.searchParams.get("force") === "1";
      await images.remove(app().docker, decodeURIComponent(c.params.ref!), force);
      return json(c, 200, { ok: true });
    }),
  ),
];
