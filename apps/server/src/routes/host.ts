import { get, json, pipe } from "@atlas/server";
import { info, ping } from "@castle/docker";
import { collect } from "../host/stats.ts";
import { app } from "../state.ts";

export const hostRoutes = [
  get(
    "/api/host",
    pipe(async (c) => json(c, 200, await collect())),
  ),
  get(
    "/api/host/engine",
    pipe(async (c) => {
      const docker = app().docker;
      const online = await ping(docker);
      if (!online) return json(c, 200, { docker: { online: false } });
      const engine = await info(docker);
      return json(c, 200, { docker: { online: true, ...engine } });
    }),
  ),
];
