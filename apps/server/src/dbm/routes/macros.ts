import { del, get, json, pipe, post } from "@atlas/server";
import { id } from "@castle/core";
import { app } from "../../state.ts";
import { parseSteps, serializeSteps } from "../macrosteps.ts";

export const macroRoutes = [
  get(
    "/api/dbm/macros",
    pipe(async (c) => {
      const rows = (await app()
        .db`SELECT id, name, steps, created_at AS "createdAt" FROM dbm_macros ORDER BY created_at DESC`) as any[];
      const macros = rows.map((r) => ({ ...r, steps: parseSteps(r.steps) }));
      return json(c, 200, macros);
    }),
  ),

  post(
    "/api/dbm/macros",
    pipe(async (c) => {
      const body = (await c.request.json()) as { name: string; steps?: unknown };
      const newId = id("mac");
      const createdAt = Date.now();
      const steps = serializeSteps(body.steps);
      await app().db`
        INSERT INTO dbm_macros (id, name, steps, created_at)
        VALUES (${newId}, ${body.name}, ${steps}, ${createdAt})
      `;
      return json(c, 200, {
        id: newId,
        name: body.name,
        steps: parseSteps(steps),
        createdAt,
      });
    }),
  ),

  del(
    "/api/dbm/macros/:macroId",
    pipe(async (c) => {
      await app().db`DELETE FROM dbm_macros WHERE id = ${c.params.macroId}`;
      return json(c, 200, { ok: true });
    }),
  ),
];
