import { publicJwkOf } from "@atlas/auth";
import { signLogoutToken } from "@atlas/oauth";
import { get, halt, json, pipe, pipeline, post } from "@atlas/server";
import { config } from "../config.ts";
import { settings as settingsStore } from "../db/index.ts";
import * as idpClients from "../idp/clients.ts";
import { getSigningKey } from "../idp/keys.ts";
import { app } from "../state.ts";
import { requireAuth } from "./middleware.ts";
import { sign } from "./token.ts";

type LoginBody = { email?: string; password?: string };

type UserRow = { id: number; email: string; password: string };

const firstUser = async (): Promise<{ id: number; email: string } | undefined> => {
  const rows = (await app().db`SELECT id, email FROM users ORDER BY id LIMIT 1`) as { id: number; email: string }[];
  return rows[0];
};

export const authRoutes = (secret: string) => [
  get(
    "/api/auth/status",
    pipe(async (c) => {
      const required = await settingsStore.get(app().db, "auth_required");
      if (required) return json(c, 200, { authRequired: true });
      const u = await firstUser();
      if (!u) return json(c, 200, { authRequired: true });
      return json(c, 200, { authRequired: false, user: u });
    }),
  ),

  post(
    "/api/auth/login",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as LoginBody;
      if (!body.email || !body.password) {
        return halt(c, 422, { error: "email and password required" });
      }
      const rows = (await app().db`SELECT id, email, password FROM users WHERE email = ${body.email}`) as UserRow[];
      const row = rows[0];
      if (!row) return halt(c, 401, { error: "invalid credentials" });
      const valid = await Bun.password.verify(body.password, row.password);
      if (!valid) return halt(c, 401, { error: "invalid credentials" });

      const token = await sign({ sub: row.id, email: row.email }, secret);
      return json(c, 200, { token, user: { id: row.id, email: row.email } });
    }),
  ),

  get(
    "/api/auth/me",
    pipeline(requireAuth(secret))(async (c) =>
      json(c, 200, { user: (c.assigns as { auth: { sub: number; email: string } }).auth }),
    ),
  ),

  // Sign out from Castle AND every connected app. Back-channel logout per
  // OIDC §2.6: for each registered client with a backchannel_logout_uri,
  // POST a signed logout_token. Best-effort: a slow or down relying party
  // doesn't block the Castle response.
  post(
    "/api/auth/logout",
    pipeline(requireAuth(secret))(async (c) => {
      const auth = (c.assigns as { auth: { sub: number; email: string } }).auth;
      const cfg = config();
      const issuer = cfg.publicUrl || `http://${cfg.host}`;
      const key = await getSigningKey(app().db);
      const clients = await idpClients.list(app().db);
      const fanOut = clients
        .filter((cl) => cl.backchannel_logout_uri && !cl.revoked_at)
        .map(async (cl) => {
          try {
            const logoutToken = await signLogoutToken(
              {
                signingKey: { kid: key.kid, privateJwk: key.privateJwk },
                jwks: async () => ({ keys: [publicJwkOf(key.publicJwk)] }),
                buildIdTokenClaims: () => ({}),
              },
              { issuer, audience: cl.client_id, sub: String(auth.sub) },
            );
            await fetch(cl.backchannel_logout_uri!, {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ logout_token: logoutToken }),
            });
          } catch {}
        });
      // Don't await — return immediately and let the fan-out land async.
      Promise.allSettled(fanOut);
      return json(c, 200, { ok: true });
    }),
  ),
];
