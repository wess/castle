import { get, json, pipe, post } from "@atlas/server";
import { app } from "../../state.ts";

type Tab = { id: string; title: string; sql: string };

export const tabRoutes = [
  get(
    "/api/dbm/tabs",
    pipe(async (c) => {
      const rows = (await app().db`SELECT id, title, sql FROM dbm_tabs ORDER BY updated_at`) as Tab[];
      return json(c, 200, rows);
    }),
  ),

  post(
    "/api/dbm/tabs",
    pipe(async (c) => {
      const body = (await c.request.json()) as Tab[];
      await app().db.begin(async (tx: any) => {
        await tx`DELETE FROM dbm_tabs`;
        for (const t of body) {
          await tx`INSERT INTO dbm_tabs (id, title, sql) VALUES (${t.id}, ${t.title}, ${t.sql})`;
        }
      });
      return json(c, 200, { ok: true });
    }),
  ),
];
