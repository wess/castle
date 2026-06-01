import { del, get, halt, json, patch, pipe, post } from "@atlas/server";
import { app } from "../state.ts";
import { isValidUsername, normalizeUsername } from "../users/derive.ts";
import { store } from "../users/index.ts";
import { deprovisionUser, provisionUser } from "../users/provision.ts";

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const idOf = (c: { params: Record<string, string | undefined> }): number | null => {
  const raw = c.params.id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const usersRoutes = [
  get(
    "/api/users",
    pipe(async (c) => {
      const users = await store.list(app().db);
      const provisions = (await app()
        .db`SELECT user_id, app_id, instance, status, error, provisioned_at FROM user_app_provisions`) as Array<{
        user_id: number;
        app_id: string;
        instance: string;
        status: string;
        error: string | null;
        provisioned_at: number;
      }>;
      const byUser = new Map<
        number,
        Array<{ appId: string; instance: string; status: string; error: string | null; at: number }>
      >();
      for (const p of provisions) {
        const list = byUser.get(p.user_id) ?? [];
        list.push({ appId: p.app_id, instance: p.instance, status: p.status, error: p.error, at: p.provisioned_at });
        byUser.set(p.user_id, list);
      }
      return json(c, 200, {
        users: users.map((u) => ({ ...u, provisions: byUser.get(u.id) ?? [] })),
      });
    }),
  ),

  post(
    "/api/users",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const email = (body.email as string | undefined)?.trim().toLowerCase();
      const password = body.password as string | undefined;
      let username = (body.username as string | undefined)?.trim();
      const name = (body.name as string | undefined)?.trim();

      if (!email || !password) return halt(c, 422, { error: "email and password required" });
      if (!EMAIL_RE.test(email)) return halt(c, 422, { error: "invalid email" });
      if (password.length < 8) return halt(c, 422, { error: "password must be at least 8 characters" });
      if (username) {
        username = normalizeUsername(username);
        if (!isValidUsername(username)) {
          return halt(c, 422, { error: "username must be 3-32 chars: lowercase letters, digits, underscores" });
        }
      }

      const existing = await store.findByEmail(app().db, email);
      if (existing) return halt(c, 409, { error: "email already in use" });

      try {
        const { user, hash } = await store.create(app().db, { email, password, username, name });
        const results = await provisionUser(app().db, user, hash);
        return json(c, 201, { user, provisions: results });
      } catch (err) {
        return halt(c, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  patch(
    "/api/users/:id/password",
    pipe(async (c) => {
      const id = idOf(c);
      if (id === null) return halt(c, 422, { error: "invalid id" });
      const body = await readJson(c.request);
      const password = body.password as string | undefined;
      if (!password || password.length < 8) {
        return halt(c, 422, { error: "password must be at least 8 characters" });
      }
      const user = await store.get(app().db, id);
      if (!user) return halt(c, 404, { error: "user not found" });
      try {
        const hash = await store.setPassword(app().db, id, password);
        const results = await provisionUser(app().db, user, hash);
        return json(c, 200, { user, provisions: results });
      } catch (err) {
        return halt(c, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/users/:id/sync",
    pipe(async (c) => {
      const id = idOf(c);
      if (id === null) return halt(c, 422, { error: "invalid id" });
      const user = await store.get(app().db, id);
      if (!user) return halt(c, 404, { error: "user not found" });
      const hash = await store.getHash(app().db, id);
      if (!hash) return halt(c, 500, { error: "user has no password hash" });
      try {
        const results = await provisionUser(app().db, user, hash);
        return json(c, 200, { user, provisions: results });
      } catch (err) {
        return halt(c, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  del(
    "/api/users/:id",
    pipe(async (c) => {
      const id = idOf(c);
      if (id === null) return halt(c, 422, { error: "invalid id" });
      const all = await store.list(app().db);
      if (all.length <= 1) return halt(c, 422, { error: "cannot delete the last user" });
      const user = all.find((u) => u.id === id);
      if (!user) return halt(c, 404, { error: "user not found" });
      const provisions = await deprovisionUser(app().db, user.email);
      await store.remove(app().db, id);
      return json(c, 200, { ok: true, deleted: id, provisions });
    }),
  ),
];
