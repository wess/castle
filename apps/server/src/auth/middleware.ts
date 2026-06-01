import { assign, halt, type PipeFn } from "@atlas/server";
import { settings as settingsStore } from "../db/index.ts";
import { app } from "../state.ts";
import { verify } from "./token.ts";

type UserRow = { id: number; email: string };

const defaultUser = async (): Promise<{ sub: number; email: string } | null> => {
  const rows = (await app().db`SELECT id, email FROM users ORDER BY id LIMIT 1`) as UserRow[];
  const row = rows[0];
  if (!row) return null;
  return { sub: row.id, email: row.email };
};

export const requireAuth =
  (secret: string): PipeFn =>
  async (c) => {
    if (!(await settingsStore.get(app().db, "auth_required"))) {
      const user = await defaultUser();
      if (!user) return halt(c, 503, { error: "no users configured" });
      return assign(c, { auth: user });
    }

    const header = c.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      return halt(c, 401, { error: "missing bearer token" });
    }
    const payload = await verify(header.slice(7), secret);
    if (!payload) return halt(c, 401, { error: "invalid token" });
    return assign(c, { auth: payload });
  };
