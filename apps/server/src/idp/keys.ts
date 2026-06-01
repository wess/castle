import { generateRs256KeyPair, type Jwk, type Rs256KeyPair } from "@atlas/auth";
import type { Db } from "../db/index.ts";

// Stored as a single JSON blob in the settings table — keeps the key
// material out of separate columns where a partial backup might split it.
const SETTING_KEY = "oidc_signing_keypair";

export type SigningKey = { kid: string; privateJwk: Jwk; publicJwk: Jwk };

const load = async (db: Db): Promise<SigningKey | null> => {
  const rows = (await db`SELECT value FROM settings WHERE key = ${SETTING_KEY}`) as { value: string }[];
  const raw = rows[0]?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SigningKey;
  } catch {
    return null;
  }
};

const save = async (db: Db, key: SigningKey): Promise<void> => {
  const v = JSON.stringify(key);
  await db`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${SETTING_KEY}, ${v}, EXTRACT(EPOCH FROM NOW())::BIGINT)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
};

/**
 * Ensure Castle has an RS256 keypair for signing id_tokens. Generated on
 * first boot, persisted as a settings row. Returns the cached key on every
 * subsequent boot.
 */
export const ensureSigningKey = async (db: Db): Promise<SigningKey> => {
  const existing = await load(db);
  if (existing) return existing;
  const pair: Rs256KeyPair = await generateRs256KeyPair();
  const key: SigningKey = { kid: pair.kid, privateJwk: pair.privateJwk, publicJwk: pair.publicJwk };
  await save(db, key);
  return key;
};

let cached: SigningKey | null = null;

/**
 * Memoised accessor — boots once, hands the same key back forever.
 * Called by JWKS, id_token signing, and end_session.
 */
export const getSigningKey = async (db: Db): Promise<SigningKey> => {
  if (cached) return cached;
  cached = await ensureSigningKey(db);
  return cached;
};
