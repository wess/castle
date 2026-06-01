import { id } from "@castle/core";
import type { Db } from "../db/index.ts";
import type { ConnectionConfig } from "./adapters/index.ts";

export type StoredConnection = ConnectionConfig & {
  name: string;
  color: string;
  group?: string;
  tags?: string[];
};

type Row = {
  id: string;
  name: string;
  type: "postgres" | "sqlite" | "mysql";
  host: string | null;
  port: number | null;
  database: string | null;
  username: string | null;
  password: string | null;
  color: string | null;
  filepath: string | null;
  ssl: unknown;
  ssh: unknown;
  startup_commands: string | null;
  safe_mode: string | null;
  group_name: string | null;
  tags: string[] | null;
};

const toConn = (r: Row): StoredConnection => ({
  id: r.id,
  name: r.name,
  type: r.type,
  host: r.host ?? "",
  port: r.port ?? 0,
  database: r.database ?? "",
  username: r.username ?? "",
  password: r.password ?? "",
  color: r.color ?? "indigo",
  filepath: r.filepath ?? undefined,
  ssl: (r.ssl as any) ?? undefined,
  ssh: (r.ssh as any) ?? undefined,
  startupCommands: r.startup_commands ?? undefined,
  safeMode: (r.safe_mode as any) ?? undefined,
  group: r.group_name ?? undefined,
  tags: r.tags ?? undefined,
});

export const list = async (db: Db): Promise<StoredConnection[]> => {
  const rows = (await db`SELECT * FROM dbm_connections ORDER BY name`) as Row[];
  return rows.map(toConn);
};

export const get = async (db: Db, connectionId: string): Promise<StoredConnection | null> => {
  const rows = (await db`SELECT * FROM dbm_connections WHERE id = ${connectionId}`) as Row[];
  const r = rows[0];
  return r ? toConn(r) : null;
};

export const save = async (
  db: Db,
  input: Omit<StoredConnection, "id"> & { id?: string },
): Promise<StoredConnection> => {
  const cid = input.id ?? id("dbm");
  const ssl = input.ssl ? JSON.stringify(input.ssl) : null;
  const ssh = input.ssh ? JSON.stringify(input.ssh) : null;
  await db`
    INSERT INTO dbm_connections (
      id, name, type, host, port, database, username, password, color,
      filepath, ssl, ssh, startup_commands, safe_mode, group_name, tags, updated_at
    ) VALUES (
      ${cid}, ${input.name}, ${input.type}, ${input.host || null}, ${input.port || null}, ${input.database || null},
      ${input.username || null}, ${input.password || null}, ${input.color || "indigo"},
      ${input.filepath || null}, ${ssl}::jsonb, ${ssh}::jsonb, ${input.startupCommands || null},
      ${input.safeMode || null}, ${input.group || null}, ${input.tags || null}, EXTRACT(EPOCH FROM NOW())::BIGINT
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      host = EXCLUDED.host,
      port = EXCLUDED.port,
      database = EXCLUDED.database,
      username = EXCLUDED.username,
      password = EXCLUDED.password,
      color = EXCLUDED.color,
      filepath = EXCLUDED.filepath,
      ssl = EXCLUDED.ssl,
      ssh = EXCLUDED.ssh,
      startup_commands = EXCLUDED.startup_commands,
      safe_mode = EXCLUDED.safe_mode,
      group_name = EXCLUDED.group_name,
      tags = EXCLUDED.tags,
      updated_at = EXCLUDED.updated_at
  `;
  const stored = await get(db, cid);
  if (!stored) throw new Error("save failed");
  return stored;
};

export const remove = async (db: Db, connectionId: string): Promise<void> => {
  await db`DELETE FROM dbm_connections WHERE id = ${connectionId}`;
};
