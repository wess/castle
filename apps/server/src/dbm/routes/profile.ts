import { halt, json, pipe, post } from "@atlas/server";
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

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const numericTypes = /int|float|double|decimal|numeric|real|serial/i;

export const profileRoutes = [
  post(
    "/api/dbm/connections/:id/tables/:table/profile",
    pipe(async (c) => {
      const adapter = await ensureOpen(c.params.id);
      if (!adapter) return halt(c, 404, { error: "not found" });
      const table = c.params.table!;

      const cols = await adapter.getColumns(table);
      const countRes = await adapter.query(`SELECT COUNT(*) AS c FROM ${ident(table)}`);
      const rowCount = num((countRes.rows[0] as any)?.c);

      const columns = [];
      for (const col of cols) {
        const t = ident(table);
        const name = ident(col.name);
        const isNumeric = numericTypes.test(col.dataType);
        const aggs = [
          `COUNT(*) - COUNT(${name}) AS nulls`,
          `COUNT(DISTINCT ${name}) AS distinct_count`,
          `MIN(${name}) AS min_value`,
          `MAX(${name}) AS max_value`,
          isNumeric ? `AVG(${name}) AS avg_value` : `NULL AS avg_value`,
        ].join(", ");
        const res = await adapter.query(`SELECT ${aggs} FROM ${t}`);
        const row = (res.rows[0] as any) ?? {};
        const nullCount = num(row.nulls);
        columns.push({
          name: col.name,
          nullCount,
          nullPercent: rowCount > 0 ? Math.round((nullCount / rowCount) * 1000) / 10 : 0,
          distinctCount: num(row.distinct_count),
          min: row.min_value ?? null,
          max: row.max_value ?? null,
          avg: isNumeric && row.avg_value != null ? num(row.avg_value) : null,
        });
      }

      return json(c, 200, { rowCount, columns });
    }),
  ),
];
