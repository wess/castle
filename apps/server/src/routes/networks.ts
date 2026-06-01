import { del, get, json, pipe, post } from "@atlas/server";
import { networks } from "@castle/docker";
import { bridges } from "@castle/network";
import { app } from "../state.ts";

export const networkRoutes = [
  get(
    "/api/networks",
    pipe(async (c) => {
      const [docker, host] = await Promise.all([networks.list(app().docker), bridges.list()]);
      return json(c, 200, { docker, host });
    }),
  ),

  post(
    "/api/networks/docker",
    pipe(async (c) => {
      const body = (await c.request.json()) as { name: string; driver?: string };
      const r = await networks.create(app().docker, body.name, body.driver ?? "bridge");
      return json(c, 201, r);
    }),
  ),

  post(
    "/api/networks/bridges",
    pipe(async (c) => {
      const body = (await c.request.json()) as { name: string };
      await bridges.create(body.name);
      return json(c, 201, { name: body.name });
    }),
  ),

  del(
    "/api/networks/docker/:id",
    pipe(async (c) => {
      await networks.remove(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  del(
    "/api/networks/bridges/:name",
    pipe(async (c) => {
      await bridges.remove(c.params.name!);
      return json(c, 200, { ok: true });
    }),
  ),
];
