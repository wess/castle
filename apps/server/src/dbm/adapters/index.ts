import { createMysqlAdapter } from "./mysql.ts";
import { createPostgresAdapter } from "./postgres.ts";
import { createSqliteAdapter } from "./sqlite.ts";
import type { ConnectionConfig, DbAdapter } from "./types.ts";

export const createAdapter = (config: ConnectionConfig): DbAdapter => {
  switch (config.type) {
    case "postgres":
      return createPostgresAdapter(config);
    case "sqlite":
      return createSqliteAdapter(config);
    case "mysql":
      return createMysqlAdapter(config);
    default:
      throw new Error(`Unsupported database type: ${(config as any).type}`);
  }
};

export type { ConnectionConfig, DbAdapter, QueryResultRaw, TableInfoRaw } from "./types.ts";
