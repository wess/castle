import { del, get, json, notFound, pipe, post, stream } from "@atlas/server";
import { containers } from "@castle/docker";
import { app } from "../state.ts";

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

export const containerRoutes = [
  get(
    "/api/containers",
    pipe(async (c) => json(c, 200, await containers.list(app().docker, true))),
  ),

  get(
    "/api/containers/:id",
    pipe(async (c) => {
      const id = c.params.id;
      if (!id) throw notFound("container id missing");
      const data = await containers.inspect(app().docker, id);
      return json(c, 200, data);
    }),
  ),

  post(
    "/api/containers",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const id = await containers.create(app().docker, body);
      return json(c, 201, { id });
    }),
  ),

  post(
    "/api/containers/:id/start",
    pipe(async (c) => {
      await containers.start(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/containers/:id/stop",
    pipe(async (c) => {
      await containers.stop(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/containers/:id/restart",
    pipe(async (c) => {
      await containers.restart(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/containers/:id/pause",
    pipe(async (c) => {
      await containers.pause(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  post(
    "/api/containers/:id/unpause",
    pipe(async (c) => {
      await containers.unpause(app().docker, c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),

  del(
    "/api/containers/:id",
    pipe(async (c) => {
      const url = new URL(c.request.url);
      const force = url.searchParams.get("force") === "1";
      await containers.remove(app().docker, c.params.id!, force);
      return json(c, 200, { ok: true });
    }),
  ),

  get(
    "/api/containers/:id/logs",
    pipe(async (c) => {
      const url = new URL(c.request.url);
      const tail = url.searchParams.get("tail") ?? "200";
      const body = await containers.logs(app().docker, c.params.id!, {
        tail: tail === "all" ? "all" : Number(tail),
      });
      return stream(c, 200, containers.demux(body));
    }),
  ),
];
