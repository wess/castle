// Castle as OIDC Provider. Wires @atlas/oauth (in OIDC mode) to Castle's
// existing users table and JWT secret.

import { publicJwkOf } from "@atlas/auth";
import { type Connection, connect } from "@atlas/db";
import { type OAuthConfig, type OAuthUser, oauthRoutes, signLogoutToken } from "@atlas/oauth";
import type { Route } from "@atlas/server";
import { halt } from "@atlas/server";
import { verify as verifyJwt } from "../auth/token.ts";
import type { Db } from "../db/index.ts";
import { list as listClients } from "./clients.ts";
import { ensureSigningKey, type SigningKey } from "./keys.ts";

const SCOPES = ["openid", "email", "profile", "offline_access"] as const;

export type IdpHandles = {
  /** Routes from @atlas/oauth ready to spread into the router. */
  routes: readonly Route[];
  /** Signing key for use by other modules (e.g. SSO buttons). */
  signingKey: SigningKey;
};

/**
 * Build the OIDC route set. Castle's bun:sql db is passed in for legacy
 * settings/clients reads; @atlas/oauth uses its own @atlas/db connection
 * to the same Postgres.
 */
export const buildIdp = async (db: Db, databaseUrl: string, secret: string): Promise<IdpHandles> => {
  const signingKey = await ensureSigningKey(db);
  const connection: Connection = connect({ driver: "postgres", url: databaseUrl });

  const loadUser: OAuthConfig["loadUser"] = async (conn, userId) => {
    const id = typeof userId === "string" ? Number(userId) : userId;
    if (!Number.isFinite(id)) return null;
    const rows = (await conn.execute({
      text: "SELECT id, email, username, name FROM users WHERE id = $1 LIMIT 1",
      values: [id],
    })) as Array<{ id: number; email: string; username: string | null; name: string | null }>;
    const row = rows[0];
    if (!row) return null;
    const user: OAuthUser = {
      id: row.id,
      email: row.email,
      username: row.username ?? row.email.split("@")[0] ?? "user",
      name: row.name ?? row.email.split("@")[0] ?? "User",
    };
    return user;
  };

  const requireUser = async (conn: any) => {
    const header = (conn.headers as Headers).get("authorization") ?? "";
    if (!header.startsWith("Bearer ")) return halt(conn, 401, { error: "auth_required" });
    const payload = await verifyJwt(header.slice(7).trim(), secret);
    if (!payload) return halt(conn, 401, { error: "invalid_token" });
    return { ...conn, assigns: { ...conn.assigns, auth: { id: payload.sub, email: payload.email } } };
  };

  // Castle has a single tenant — admin == any logged-in user (only the
  // operator should be hitting /admin/oauth anyway). Reuse requireUser.
  const requireAdmin = requireUser;

  const jwksFn = async () => ({ keys: [publicJwkOf(signingKey.publicJwk)] });

  const oauthConfig: OAuthConfig = {
    db: connection,
    secret,
    scopes: SCOPES,
    loadUser,
    buildAccessTokenClaims: (user) => ({
      sub: String(user.id),
      email: user.email,
      preferred_username: user.username,
    }),
    requireUser,
    requireAdmin,
    openid: {
      signingKey: { kid: signingKey.kid, privateJwk: signingKey.privateJwk },
      jwks: jwksFn,
      buildIdTokenClaims: (user) => ({
        sub: String(user.id),
        email: user.email,
        email_verified: true,
        name: user.name,
        preferred_username: user.username,
      }),
      onEndSession: async ({ userId, issuer }) => {
        // Iterate clients and fan out signed logout_tokens. Errors are
        // swallowed — back-channel delivery is best-effort by spec.
        const clients = await listClients(db);
        for (const client of clients) {
          if (!client.backchannel_logout_uri || client.revoked_at) continue;
          try {
            const logoutToken = await signLogoutToken(
              {
                signingKey: { kid: signingKey.kid, privateJwk: signingKey.privateJwk },
                jwks: jwksFn,
                buildIdTokenClaims: () => ({}),
              },
              { issuer, audience: client.client_id, sub: String(userId) },
            );
            await fetch(client.backchannel_logout_uri, {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ logout_token: logoutToken }),
            }).catch(() => {});
          } catch {}
        }
      },
    },
  };

  return { routes: oauthRoutes(oauthConfig), signingKey };
};
