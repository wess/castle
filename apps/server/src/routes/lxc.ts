import { type Conn, del, get, json, type PipeFn, pipe, post } from "@atlas/server";
import * as lxc from "@castle/lxc";

// Surface host-op failures (lxc-create/start/...) as a 422 with the real
// stderr instead of letting them bubble up as an opaque 500.
const guard =
  (fn: PipeFn): PipeFn =>
  async (c: Conn) => {
    try {
      return await fn(c);
    } catch (err) {
      return json(c, 422, { error: err instanceof Error ? err.message : String(err) });
    }
  };

export const lxcRoutes = [
  get("/api/lxc", pipe(guard(async (c) => json(c, 200, await lxc.list())))),

  get(
    "/api/lxc/:name",
    pipe(
      guard(async (c) => {
        const data = await lxc.inspect(c.params.name!);
        if (!data) return json(c, 404, { error: "not found" });
        return json(c, 200, data);
      }),
    ),
  ),

  post(
    "/api/lxc",
    pipe(
      guard(async (c) => {
        const spec = (await c.request.json()) as lxc.CreateLxcSpec;
        await lxc.create(spec);
        return json(c, 201, { name: spec.name });
      }),
    ),
  ),

  post(
    "/api/lxc/:name/start",
    pipe(
      guard(async (c) => {
        await lxc.start(c.params.name!);
        return json(c, 200, { ok: true });
      }),
    ),
  ),

  post(
    "/api/lxc/:name/stop",
    pipe(
      guard(async (c) => {
        await lxc.stop(c.params.name!);
        return json(c, 200, { ok: true });
      }),
    ),
  ),

  del(
    "/api/lxc/:name",
    pipe(
      guard(async (c) => {
        const url = new URL(c.request.url);
        const force = url.searchParams.get("force") === "1";
        await lxc.destroy(c.params.name!, force);
        return json(c, 200, { ok: true });
      }),
    ),
  ),
];
