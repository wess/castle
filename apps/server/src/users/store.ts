import type { Db } from "../db/index.ts";
import { nameFromEmail, usernameFromEmail } from "./derive.ts";
import type { CreateUserInput, ProvisionRecord, User } from "./types.ts";

type Row = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  created_at: number;
};

const normalize = (r: Row): User => ({
  id: r.id,
  email: r.email,
  username: r.username ?? usernameFromEmail(r.email),
  name: r.name ?? nameFromEmail(r.email),
  created_at: r.created_at,
});

export const list = async (db: Db): Promise<User[]> => {
  const rows = (await db`
    SELECT id, email, username, name, created_at
    FROM users
    ORDER BY id ASC
  `) as Row[];
  return rows.map(normalize);
};

export const get = async (db: Db, id: number): Promise<User | null> => {
  const rows = (await db`
    SELECT id, email, username, name, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `) as Row[];
  const row = rows[0];
  return row ? normalize(row) : null;
};

export const findByEmail = async (db: Db, email: string): Promise<User | null> => {
  const rows = (await db`
    SELECT id, email, username, name, created_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `) as Row[];
  const row = rows[0];
  return row ? normalize(row) : null;
};

export const create = async (db: Db, input: CreateUserInput): Promise<{ user: User; hash: string }> => {
  const email = input.email.trim().toLowerCase();
  const username = input.username?.trim() || usernameFromEmail(email);
  const name = input.name?.trim() || nameFromEmail(email);
  const hash = await Bun.password.hash(input.password, { algorithm: "argon2id" });
  const rows = (await db`
    INSERT INTO users (email, password, username, name)
    VALUES (${email}, ${hash}, ${username}, ${name})
    RETURNING id, email, username, name, created_at
  `) as Row[];
  return { user: normalize(rows[0]!), hash };
};

export const setPassword = async (db: Db, id: number, password: string): Promise<string> => {
  const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
  await db`UPDATE users SET password = ${hash} WHERE id = ${id}`;
  return hash;
};

export const getHash = async (db: Db, id: number): Promise<string | null> => {
  const rows = (await db`SELECT password FROM users WHERE id = ${id} LIMIT 1`) as Array<{ password: string }>;
  return rows[0]?.password ?? null;
};

export const remove = async (db: Db, id: number): Promise<void> => {
  await db`DELETE FROM user_app_provisions WHERE user_id = ${id}`;
  await db`DELETE FROM users WHERE id = ${id}`;
};

export const recordProvision = async (db: Db, rec: Omit<ProvisionRecord, "provisioned_at">): Promise<void> => {
  await db`
    INSERT INTO user_app_provisions (user_id, app_id, instance, status, error, provisioned_at)
    VALUES (${rec.user_id}, ${rec.app_id}, ${rec.instance}, ${rec.status}, ${rec.error}, EXTRACT(EPOCH FROM NOW())::BIGINT)
    ON CONFLICT (user_id, app_id, instance) DO UPDATE
      SET status = EXCLUDED.status,
          error = EXCLUDED.error,
          provisioned_at = EXCLUDED.provisioned_at
  `;
};

export const provisionsFor = async (db: Db, userId: number): Promise<ProvisionRecord[]> => {
  const rows = (await db`
    SELECT user_id, app_id, instance, status, error, provisioned_at
    FROM user_app_provisions
    WHERE user_id = ${userId}
  `) as ProvisionRecord[];
  return rows;
};
