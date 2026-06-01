import { del, get, halt, json, pipe, post } from "@atlas/server";
import { id } from "@castle/core";
import { app } from "../../state.ts";
import * as pool from "../pool.ts";
import * as store from "../store.ts";

const ensureOpen = async (connectionId?: string) => {
  if (!connectionId) throw new Error("connection id required");
  if (!pool.isOpen(connectionId)) {
    const conn = await store.get(app().db, connectionId);
    if (!conn) return null;
    await pool.open(conn);
  }
  return pool.get(connectionId);
};

const splitStatements = (sql: string): string[] => {
  const statements: string[] = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let prev = "";
  for (const ch of sql) {
    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
    } else if (inBlockComment) {
      buf += ch;
      if (prev === "*" && ch === "/") inBlockComment = false;
    } else if (inSingle) {
      buf += ch;
      if (ch === "'" && prev !== "\\") inSingle = false;
    } else if (inDouble) {
      buf += ch;
      if (ch === '"' && prev !== "\\") inDouble = false;
    } else if (ch === "-" && prev === "-") {
      buf += ch;
      inLineComment = true;
    } else if (ch === "*" && prev === "/") {
      buf += ch;
      inBlockComment = true;
    } else if (ch === "'") {
      buf += ch;
      inSingle = true;
    } else if (ch === '"') {
      buf += ch;
      inDouble = true;
    } else if (ch === ";") {
      const s = buf.trim();
      if (s) statements.push(s);
      buf = "";
    } else {
      buf += ch;
    }
    prev = ch;
  }
  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
};

const recordHistory = async (
  connectionId: string,
  sql: string,
  startedAt: number,
  rowsAffected: number,
  error?: string,
) => {
  try {
    await app().db`
      INSERT INTO dbm_query_history (id, connection_id, sql, executed_at, execution_time, rows_affected, error)
      VALUES (${id("qh")}, ${connectionId}, ${sql}, ${startedAt}, ${Date.now() - startedAt}, ${rowsAffected}, ${error ?? null})
    `;
  } catch {
    // history is best-effort
  }
};

export const queryRoutes = [
  post(
    "/api/dbm/connections/:id/query",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const body = (await c.request.json()) as { sql: string };
      const started = Date.now();
      try {
        const result = await adapter.query(body.sql);
        await recordHistory(c.params.id!, body.sql, started, result.rowsAffected);
        return json(c, 200, { ...result, executionTime: Date.now() - started });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        await recordHistory(c.params.id!, body.sql, started, 0, err);
        return json(c, 200, {
          columns: [],
          columnTypes: {},
          rows: [],
          rowsAffected: 0,
          executionTime: Date.now() - started,
          error: err,
        });
      }
    }),
  ),

  post(
    "/api/dbm/connections/:id/query/multi",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const body = (await c.request.json()) as { sql: string };
      const statements = splitStatements(body.sql);
      const out: any[] = [];
      for (const s of statements) {
        const started = Date.now();
        try {
          const result = await adapter.query(s);
          await recordHistory(c.params.id!, s, started, result.rowsAffected);
          out.push({ ...result, sql: s, executionTime: Date.now() - started });
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          await recordHistory(c.params.id!, s, started, 0, err);
          out.push({
            columns: [],
            columnTypes: {},
            rows: [],
            rowsAffected: 0,
            executionTime: Date.now() - started,
            error: err,
            sql: s,
          });
        }
      }
      return json(c, 200, out);
    }),
  ),

  get(
    "/api/dbm/history",
    pipe(async (c) => {
      const rows = (await app()
        .db`SELECT id, connection_id AS "connectionId", sql, executed_at AS "executedAt", execution_time AS "executionTime", rows_affected AS "rowsAffected", error FROM dbm_query_history ORDER BY executed_at DESC LIMIT 200`) as any[];
      return json(
        c,
        200,
        rows.map((r) => ({ ...r, executedAt: new Date(Number(r.executedAt)).toISOString() })),
      );
    }),
  ),

  del(
    "/api/dbm/history",
    pipe(async (c) => {
      await app().db`TRUNCATE TABLE dbm_query_history`;
      return json(c, 200, { ok: true });
    }),
  ),
];
