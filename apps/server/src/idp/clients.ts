import { randomBytes } from "node:crypto";
import { sha256, shortId } from "@atlas/oauth";
import type { Db } from "../db/index.ts";

export type OAuthClientRow = {
  id: number;
  client_id: string;
  name: string;
  app_id: string | null;
  instance: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  backchannel_logout_uri: string | null;
  post_logout_redirect_uris: string[];
  is_official: boolean;
  created_at: string;
  revoked_at: string | null;
};

type RawRow = {
  id: number;
  client_id: string;
  name: string;
  app_id: string | null;
  instance: string | null;
  redirect_uris: string;
  allowed_scopes: string;
  backchannel_logout_uri: string | null;
  post_logout_redirect_uris: string | null;
  is_official: boolean;
  created_at: string;
  revoked_at: string | null;
};

const parseJsonArray = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

const normalize = (r: RawRow): OAuthClientRow => ({
  id: r.id,
  client_id: r.client_id,
  name: r.name,
  app_id: r.app_id,
  instance: r.instance,
  redirect_uris: parseJsonArray(r.redirect_uris),
  allowed_scopes: parseJsonArray(r.allowed_scopes),
  backchannel_logout_uri: r.backchannel_logout_uri,
  post_logout_redirect_uris: parseJsonArray(r.post_logout_redirect_uris),
  is_official: r.is_official,
  created_at: r.created_at,
  revoked_at: r.revoked_at,
});

export const list = async (db: Db): Promise<OAuthClientRow[]> => {
  const rows = (await db`
    SELECT id, client_id, name, app_id, instance, redirect_uris, allowed_scopes,
           backchannel_logout_uri, post_logout_redirect_uris, is_official,
           created_at, revoked_at
    FROM oauth_clients
    ORDER BY created_at DESC
  `) as RawRow[];
  return rows.map(normalize);
};

export const findByInstance = async (db: Db, appId: string, instance: string): Promise<OAuthClientRow | null> => {
  const rows = (await db`
    SELECT id, client_id, name, app_id, instance, redirect_uris, allowed_scopes,
           backchannel_logout_uri, post_logout_redirect_uris, is_official,
           created_at, revoked_at
    FROM oauth_clients
    WHERE app_id = ${appId} AND instance = ${instance}
    LIMIT 1
  `) as RawRow[];
  const r = rows[0];
  return r ? normalize(r) : null;
};

export type CreateClientInput = {
  name: string;
  appId: string;
  instance: string;
  redirectUris: string[];
  backchannelLogoutUri?: string | null;
  postLogoutRedirectUris?: string[];
  allowedScopes?: string[];
};

export type CreatedClient = {
  client: OAuthClientRow;
  /** Plaintext secret — shown once, then only the hash is kept. */
  clientSecret: string;
};

export const create = async (db: Db, input: CreateClientInput): Promise<CreatedClient> => {
  const clientId = shortId("cli");
  const secret = `cls_${randomBytes(24).toString("base64url")}`;
  const secretHash = sha256(secret);
  const scopes = input.allowedScopes ?? ["openid", "email", "profile"];
  const redirects = JSON.stringify(input.redirectUris);
  const postLogout = JSON.stringify(input.postLogoutRedirectUris ?? []);
  const allowedScopes = JSON.stringify(scopes);
  await db`
    INSERT INTO oauth_clients (
      client_id, client_secret_hash, name, app_id, instance,
      redirect_uris, allowed_scopes, backchannel_logout_uri,
      post_logout_redirect_uris, is_official
    )
    VALUES (
      ${clientId}, ${secretHash}, ${input.name}, ${input.appId}, ${input.instance},
      ${redirects}, ${allowedScopes}, ${input.backchannelLogoutUri ?? null},
      ${postLogout}, TRUE
    )
  `;
  const client = await findByInstance(db, input.appId, input.instance);
  if (!client) throw new Error("oauth client insert failed");
  return { client, clientSecret: secret };
};

export const removeByInstance = async (db: Db, instance: string): Promise<void> => {
  await db`DELETE FROM oauth_clients WHERE instance = ${instance}`;
};

export const revoke = async (db: Db, id: number): Promise<void> => {
  await db`UPDATE oauth_clients SET revoked_at = NOW() WHERE id = ${id}`;
};
