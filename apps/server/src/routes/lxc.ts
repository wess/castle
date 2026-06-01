import { del, get, json, pipe, post } from "@atlas/server";
import * as lxc from "@castle/lxc";

export const lxcRoutes = [
  get(
    "/api/lxc",
    pipe(async (c) => json(c, 200, await lxc.list())),
  ),

  get(
    "/api/lxc/:name",
    pipe(async (c) => {
      const data = await lxc.inspect(c.params.name!);
      if (!data) return json(c, 404, { error: "not found" });
      return json(c, 200, data);
    }),
  ),

  post(
    "/api/lxc",
    pipe(async (c) => {
      const spec = (await c.request.json()) as lxc.CreateLxcSpec;
      await lxc.create(spec);
      return json(c, 201, { name: spec.name });
    }),
  ),

  post(
    "/api/lxc/:name/start",
    pipe(async (c) => {
      await lxc.start(c.params.name!);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/lxc/:name/stop",
    pipe(async (c) => {
      await lxc.stop(c.params.name!);
      return json(c, 200, { ok: true });
    }),
  ),

  del(
    "/api/lxc/:name",
    pipe(async (c) => {
      const url = new URL(c.request.url);
      const force = url.searchParams.get("force") === "1";
      await lxc.destroy(c.params.name!, force);
      return json(c, 200, { ok: true });
    }),
  ),
];
