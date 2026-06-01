import { del, get, json, pipe, post } from "@atlas/server";
import { id } from "@castle/core";
import { app } from "../../state.ts";

type Favorite = { id: string; name: string; sql: string; created_at: number };

export const favoriteRoutes = [
  get(
    "/api/dbm/favorites",
    pipe(async (c) => {
      const rows = (await app().db`SELECT id, name, sql, created_at FROM dbm_favorites ORDER BY name`) as Favorite[];
      return json(
        c,
        200,
        rows.map((r) => ({
          ...r,
          createdAt: new Date(Number(r.created_at) * 1000).toISOString(),
        })),
      );
    }),
  ),

  post(
    "/api/dbm/favorites",
    pipe(async (c) => {
      const body = (await c.request.json()) as { id?: string; name: string; sql: string };
      const fid = body.id ?? id("fav");
      await app().db`
        INSERT INTO dbm_favorites (id, name, sql) VALUES (${fid}, ${body.name}, ${body.sql})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sql = EXCLUDED.sql
      `;
      const rows = (await app()
        .db`SELECT id, name, sql, created_at FROM dbm_favorites WHERE id = ${fid}`) as Favorite[];
      const r = rows[0]!;
      return json(c, 200, {
        ...r,
        createdAt: new Date(Number(r.created_at) * 1000).toISOString(),
      });
    }),
  ),

  del(
    "/api/dbm/favorites/:id",
    pipe(async (c) => {
      await app().db`DELETE FROM dbm_favorites WHERE id = ${c.params.id!}`;
      return json(c, 200, { ok: true });
    }),
  ),
];
