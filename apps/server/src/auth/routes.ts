import { publicJwkOf } from "@atlas/auth";
import { signLogoutToken } from "@atlas/oauth";
import { get, halt, json, pipe, pipeline, post } from "@atlas/server";
import { config } from "../config.ts";
import { settings as settingsStore } from "../db/index.ts";
import * as idpClients from "../idp/clients.ts";
import { getSigningKey } from "../idp/keys.ts";
import { app } from "../state.ts";
import { derive, store as usersStore } from "../users/index.ts";
import { requireAuth } from "./middleware.ts";
import { sign } from "./token.ts";

// Login accepts a single identifier that is matched against email OR username,
// so internal users can sign in with just a username (email is optional).
type LoginBody = { identifier?: string; email?: string; username?: string; password?: string };
type SignupBody = { username?: string; email?: string; password?: string; name?: string };

type UserRow = { id: number; email: string; password: string };

const firstUser = async (): Promise<{ id: number; email: string } | undefined> => {
  const rows = (await app().db`SELECT id, email FROM users ORDER BY id LIMIT 1`) as { id: number; email: string }[];
  return rows[0];
};

// Placeholder email host for username-only signups, derived from the public
// issuer URL so the id_token always carries a syntactically valid email claim
// (downstream apps require one). Falls back to castle.local.
const placeholderHost = (): string => {
  try {
    return new URL(config().publicUrl).hostname || "castle.local";
  } catch {
    return "castle.local";
  }
};

export const authRoutes = (secret: string) => [
  get(
    "/api/auth/status",
    pipe(async (c) => {
      const required = await settingsStore.get(app().db, "auth_required");
      const u = await firstUser();
      // No users yet -> the first visitor self-registers as the owner.
      const needsSetup = !u;
      // Ollama features (nav + page) only make sense when an ollama backend is
      // configured. Hidden by default (e.g. on a host with no local ollama).
      const ollama = Boolean(await settingsStore.get(app().db, "ollama_url"));
      if (required) return json(c, 200, { authRequired: true, needsSetup, ollama });
      if (!u) return json(c, 200, { authRequired: true, needsSetup: true, ollama });
      return json(c, 200, { authRequired: false, user: u, needsSetup: false, ollama });
    }),
  ),

  post(
    "/api/auth/login",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as LoginBody;
      const identifier = (body.identifier ?? body.email ?? body.username ?? "").trim().toLowerCase();
      if (!identifier || !body.password) {
        return halt(c, 422, { error: "username/email and password required" });
      }
      const rows = (await app()
        .db`SELECT id, email, password FROM users WHERE email = ${identifier} OR username = ${identifier} LIMIT 1`) as UserRow[];
      const row = rows[0];
      if (!row) return halt(c, 401, { error: "invalid credentials" });
      const valid = await Bun.password.verify(body.password, row.password);
      if (!valid) return halt(c, 401, { error: "invalid credentials" });

      const token = await sign({ sub: row.id, email: row.email }, secret);
      return json(c, 200, { token, user: { id: row.id, email: row.email } });
    }),
  ),

  // First-run self-signup. Open only while no user exists; that first user is
  // the owner. After setup, accounts are created by the owner in Settings.
  post(
    "/api/auth/signup",
    pipe(async (c) => {
      if (await firstUser()) return halt(c, 403, { error: "signup is closed — ask the owner to add you" });
      const body = (await c.request.json().catch(() => ({}))) as SignupBody;
      const username = (body.username ?? "").trim().toLowerCase();
      if (!derive.isValidUsername(username)) {
        return halt(c, 422, { error: "username must be 3-32 characters: lowercase letters, digits, underscore" });
      }
      if (!body.password || body.password.length < 8) {
        return halt(c, 422, { error: "password must be at least 8 characters" });
      }
      const email = (body.email ?? "").trim().toLowerCase() || `${username}@${placeholderHost()}`;
      try {
        const { user } = await usersStore.create(app().db, { email, username, password: body.password, name: body.name });
        const token = await sign({ sub: user.id, email: user.email }, secret);
        return json(c, 201, { token, user: { id: user.id, email: user.email, username: user.username } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/unique|duplicate/i.test(msg)) return halt(c, 409, { error: "username or email already taken" });
        return halt(c, 500, { error: msg });
      }
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
