import { get, json, pipe, post } from "@atlas/server";
import { app } from "../../state.ts";

const KEY = "dbm.prefs";

export const settingsRoutes = [
  get(
    "/api/dbm/settings",
    pipe(async (c) => {
      const rows = (await app().db`SELECT value FROM settings WHERE key = ${KEY}`) as { value: string }[];
      const row = rows[0];
      if (!row) return json(c, 200, null);
      try {
        return json(c, 200, JSON.parse(row.value));
      } catch {
        return json(c, 200, null);
      }
    }),
  ),

  post(
    "/api/dbm/settings",
    pipe(async (c) => {
      const body = await c.request.json();
      const value = JSON.stringify(body);
      await app().db`
        INSERT INTO settings (key, value, updated_at) VALUES (${KEY}, ${value}, EXTRACT(EPOCH FROM NOW())::BIGINT)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      `;
      return json(c, 200, { ok: true });
    }),
  ),
];
