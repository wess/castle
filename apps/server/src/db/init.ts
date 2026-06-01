import { SQL } from "bun";

export type Db = SQL;

export const connect = (url: string): Db => new SQL(url);

export const migrate = async (db: Db): Promise<void> => {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  // username + name feed Stohr/Tangle which require both. Both default to the
  // local-part of the email so the original single-user bootstrap path keeps
  // working without a migration prompt.
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`;
  await db`
    CREATE TABLE IF NOT EXISTS user_app_provisions (
      user_id INTEGER NOT NULL,
      app_id TEXT NOT NULL,
      instance TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      provisioned_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      PRIMARY KEY (user_id, app_id, instance)
    )
  `;
  // Registry of user-aware app instances Castle should push users into.
  // Auto-populated for Castle-installed apps (via the Apps catalog); admins
  // can also add external/manual instances by pasting hostname + token.
  await db`
    CREATE TABLE IF NOT EXISTS app_connections (
      id SERIAL PRIMARY KEY,
      app_id TEXT NOT NULL,
      instance TEXT NOT NULL,
      hostname TEXT NOT NULL,
      token TEXT NOT NULL,
      managed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE (app_id, instance)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS audit (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      target TEXT,
      at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      meta TEXT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS dbm_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      database TEXT,
      username TEXT,
      password TEXT,
      color TEXT,
      filepath TEXT,
      ssl JSONB,
      ssh JSONB,
      startup_commands TEXT,
      safe_mode TEXT,
      group_name TEXT,
      tags TEXT[],
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS dbm_query_history (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      sql TEXT NOT NULL,
      executed_at BIGINT NOT NULL,
      execution_time INTEGER NOT NULL,
      rows_affected INTEGER NOT NULL,
      error TEXT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS dbm_favorites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sql TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS dbm_macros (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      steps TEXT NOT NULL DEFAULT '[]',
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS dbm_tabs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sql TEXT NOT NULL,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS ollama_chats (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      messages JSONB NOT NULL DEFAULT '[]'::JSONB,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS ollama_chats_user_updated_idx ON ollama_chats (user_id, updated_at DESC)`;
  await db`
    CREATE TABLE IF NOT EXISTS host_routes (
      hostname TEXT PRIMARY KEY,
      backend TEXT NOT NULL,
      websocket BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `;
  await db`
    ALTER TABLE host_routes
      ADD COLUMN IF NOT EXISTS locations JSONB NOT NULL DEFAULT '[]'::JSONB
  `;

  // OIDC / OAuth — Castle is the homelab IdP. Apps installed via the Apps
  // catalog auto-register a client at install time; external apps can be
  // wired up manually from Settings -> SSO.
  await db`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      id SERIAL PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      client_secret_hash TEXT,
      name TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      redirect_uris TEXT NOT NULL DEFAULT '[]',
      allowed_scopes TEXT NOT NULL DEFAULT '["openid","email","profile"]',
      is_official BOOLEAN NOT NULL DEFAULT FALSE,
      backchannel_logout_uri TEXT,
      post_logout_redirect_uris TEXT,
      app_id TEXT,
      instance TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL DEFAULT 'S256',
      scope TEXT NOT NULL,
      nonce TEXT,
      auth_time BIGINT,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      scope TEXT NOT NULL,
      parent_token_hash TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS oauth_device_codes (
      device_code TEXT PRIMARY KEY,
      user_code TEXT NOT NULL UNIQUE,
      client_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      user_id INTEGER,
      approved_at TIMESTAMPTZ,
      denied_at TIMESTAMPTZ,
      last_polled_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};
