import { verify } from "../auth/token.ts";
import { settings as settingsStore } from "../db/index.ts";
import { app } from "../state.ts";

export type WsAuth = { sub: number; email: string };

export const authorize = async (url: URL, secret: string): Promise<WsAuth | null> => {
  if (!(await settingsStore.get(app().db, "auth_required"))) {
    const rows = (await app().db`SELECT id, email FROM users ORDER BY id LIMIT 1`) as Array<{
      id: number;
      email: string;
    }>;
    const row = rows[0];
    return row ? { sub: row.id, email: row.email } : null;
  }
  const token = url.searchParams.get("token");
  if (!token) return null;
  const payload = await verify(token, secret);
  if (!payload) return null;
  return { sub: payload.sub, email: payload.email };
};
