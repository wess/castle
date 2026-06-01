import type { Db } from "../db/index.ts";
import type { AppConnection, AppConnectionInput } from "./types.ts";

type Row = {
  id: number;
  app_id: string;
  instance: string;
  hostname: string;
  token: string;
  managed: boolean;
  created_at: number;
};

const normalize = (r: Row): AppConnection => ({
  id: r.id,
  appId: r.app_id as "tangle" | "stohr",
  instance: r.instance,
  hostname: r.hostname,
  token: r.token,
  managed: r.managed,
  created_at: r.created_at,
});

export const list = async (db: Db): Promise<AppConnection[]> => {
  const rows = (await db`
    SELECT id, app_id, instance, hostname, token, managed, created_at
    FROM app_connections
    ORDER BY app_id, instance
  `) as Row[];
  return rows.map(normalize);
};

export const upsert = async (db: Db, input: AppConnectionInput): Promise<AppConnection> => {
  const managed = input.managed ?? false;
  await db`
    INSERT INTO app_connections (app_id, instance, hostname, token, managed)
    VALUES (${input.appId}, ${input.instance}, ${input.hostname}, ${input.token}, ${managed})
    ON CONFLICT (app_id, instance) DO UPDATE
      SET hostname = EXCLUDED.hostname,
          token = EXCLUDED.token,
          managed = EXCLUDED.managed
  `;
  const rows = (await db`
    SELECT id, app_id, instance, hostname, token, managed, created_at
    FROM app_connections
    WHERE app_id = ${input.appId} AND instance = ${input.instance}
    LIMIT 1
  `) as Row[];
  return normalize(rows[0]!);
};

export const remove = async (db: Db, id: number): Promise<void> => {
  await db`DELETE FROM app_connections WHERE id = ${id}`;
};

export const removeByInstance = async (db: Db, instance: string): Promise<void> => {
  await db`DELETE FROM app_connections WHERE instance = ${instance}`;
};
