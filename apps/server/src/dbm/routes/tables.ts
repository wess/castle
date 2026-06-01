import { del, get, halt, json, pipe, post, put } from "@atlas/server";
import { app } from "../../state.ts";
import * as pool from "../pool.ts";
import * as store from "../store.ts";

const ensureOpen = async (id?: string) => {
  if (!id) throw new Error("connection id required");
  if (!pool.isOpen(id)) {
    const conn = await store.get(app().db, id);
    if (!conn) return null;
    await pool.open(conn);
  }
  return pool.get(id);
};

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

export const tableRoutes = [
  get(
    "/api/dbm/connections/:id/tables",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      return json(c, 200, await adapter.getTables());
    }),
  ),

  get(
    "/api/dbm/connections/:id/tables/:table/structure",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const table = c.params.table!;
      const [columns, indexes, foreignKeys] = await Promise.all([
        adapter.getColumns(table),
        adapter.getIndexes(table),
        adapter.getForeignKeys(table),
      ]);
      return json(c, 200, { columns, indexes, foreignKeys });
    }),
  ),

  get(
    "/api/dbm/connections/:id/tables/:table/ddl",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const ddl = await adapter.getDdl(c.params.table!);
      return json(c, 200, { ddl });
    }),
  ),

  post(
    "/api/dbm/connections/:id/tables/:table/rows",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const body = (await c.request.json().catch(() => ({}))) as {
        page?: number;
        pageSize?: number;
        sort?: { column: string; direction: "asc" | "desc" };
        filters?: { column: string; operator: string; value?: unknown }[];
        filterLogic?: "and" | "or";
      };
      const page = body.page ?? 1;
      const pageSize = body.pageSize ?? 100;
      const offset = (page - 1) * pageSize;
      const t = c.params.table!;
      const orderBy = body.sort
        ? `ORDER BY ${ident(body.sort.column)} ${body.sort.direction === "desc" ? "DESC" : "ASC"}`
        : "";
      const sql = `SELECT * FROM ${ident(t)} ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;
      const countSql = `SELECT COUNT(*) AS c FROM ${ident(t)}`;
      const [data, count] = await Promise.all([adapter.query(sql), adapter.query(countSql)]);
      const total = Number((count.rows[0] as any)?.c ?? 0);
      return json(c, 200, {
        rows: data.rows,
        columns: data.columns,
        columnTypes: data.columnTypes,
        total,
        page,
        pageSize,
      });
    }),
  ),

  post(
    "/api/dbm/connections/:id/tables/:table/insert",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const t = c.params.table!;
      const body = (await c.request.json()) as { row: Record<string, unknown> };
      const cols = Object.keys(body.row);
      const placeholders = cols.map((col) => formatValue((body.row as any)[col])).join(", ");
      const sql = `INSERT INTO ${ident(t)} (${cols.map(ident).join(", ")}) VALUES (${placeholders})`;
      await adapter.query(sql);
      return json(c, 200, { ok: true });
    }),
  ),

  put(
    "/api/dbm/connections/:id/tables/:table/update",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const t = c.params.table!;
      const body = (await c.request.json()) as {
        primaryKey: Record<string, unknown>;
        changes: Record<string, unknown>;
      };
      const sets = Object.entries(body.changes)
        .map(([k, v]) => `${ident(k)} = ${formatValue(v)}`)
        .join(", ");
      const where = Object.entries(body.primaryKey)
        .map(([k, v]) => `${ident(k)} = ${formatValue(v)}`)
        .join(" AND ");
      const sql = `UPDATE ${ident(t)} SET ${sets} WHERE ${where}`;
      await adapter.query(sql);
      return json(c, 200, { ok: true });
    }),
  ),

  del(
    "/api/dbm/connections/:id/tables/:table/delete",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const t = c.params.table!;
      const body = (await c.request.json()) as { primaryKey: Record<string, unknown> };
      const where = Object.entries(body.primaryKey)
        .map(([k, v]) => `${ident(k)} = ${formatValue(v)}`)
        .join(" AND ");
      const sql = `DELETE FROM ${ident(t)} WHERE ${where}`;
      await adapter.query(sql);
      return json(c, 200, { ok: true });
    }),
  ),
];

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
