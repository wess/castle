import { del, get, json, pipe, post } from "@atlas/server";
import { volumes } from "@castle/docker";
import { dir, lvm, zfs } from "@castle/storage";
import { app } from "../state.ts";

export const storageRoutes = [
  get(
    "/api/storage/pools",
    pipe(async (c) => {
      const [z, l, root] = await Promise.all([zfs.pools(), lvm.pools(), dir.fromPath("root", "/")]);
      const pools = [...z, ...l];
      if (root) pools.push(root);
      return json(c, 200, pools);
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
