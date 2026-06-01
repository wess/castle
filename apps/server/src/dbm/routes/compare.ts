import { halt, json, pipe, post } from "@atlas/server";
import { app } from "../../state.ts";
import * as pool from "../pool.ts";
import { diffColumns, diffTableSets } from "../schemadiff.ts";
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

export const compareRoutes = [
  post(
    "/api/dbm/schema/compare",
    pipe(async (c) => {
      const body = (await c.request.json()) as {
        sourceConnectionId: string;
        targetConnectionId: string;
      };
      const source = await ensureOpen(body.sourceConnectionId);
      const target = await ensureOpen(body.targetConnectionId);
      if (!source || !target) return halt(c, 404, { error: "connection not found" });

      const [sourceTables, targetTables] = await Promise.all([source.getTables(), target.getTables()]);
      const { onlyInSource, onlyInTarget, shared } = diffTableSets(
        sourceTables.map((t) => t.name),
        targetTables.map((t) => t.name),
      );

      const different: { table: string; differences: string[] }[] = [];
      const identical: string[] = [];
      for (const name of shared) {
        const [sc, tc] = await Promise.all([source.getColumns(name), target.getColumns(name)]);
        const differences = diffColumns(sc, tc);
        if (differences.length > 0) different.push({ table: name, differences });
        else identical.push(name);
      }

      return json(c, 200, { onlyInSource, onlyInTarget, different, identical });
    }),
  ),
];
