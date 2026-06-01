import { describe, expect, test } from "bun:test";
import type { ColumnInfoRaw } from "./adapters/types.ts";
import { columnSignature, diffColumns, diffTableSets } from "./schemadiff.ts";

const col = (over: Partial<ColumnInfoRaw>): ColumnInfoRaw => ({
  name: "id",
  dataType: "integer",
  nullable: false,
  defaultValue: null,
  isPrimaryKey: false,
  comment: null,
  ...over,
});

describe("columnSignature", () => {
  test("encodes type, nullability, and pk", () => {
    expect(columnSignature(col({ dataType: "text", nullable: true }))).toBe("text|null|");
    expect(columnSignature(col({ isPrimaryKey: true }))).toBe("integer|notnull|pk");
  });
});

describe("diffColumns", () => {
  test("reports columns only in source", () => {
    const out = diffColumns([col({ name: "id" }), col({ name: "extra" })], [col({ name: "id" })]);
    expect(out).toEqual([`column "extra" only in source`]);
  });
  test("reports columns only in target", () => {
    const out = diffColumns([col({ name: "id" })], [col({ name: "id" }), col({ name: "added" })]);
    expect(out).toEqual([`column "added" only in target`]);
  });
  test("reports type/nullable/pk changes", () => {
    const out = diffColumns([col({ name: "id", dataType: "integer" })], [col({ name: "id", dataType: "bigint" })]);
    expect(out.length).toBe(1);
    expect(out[0]).toContain(`column "id" differs`);
  });
  test("identical columns produce no diff", () => {
    expect(diffColumns([col({ name: "id" })], [col({ name: "id" })])).toEqual([]);
  });
});

describe("diffTableSets", () => {
  test("partitions tables and sorts each bucket", () => {
    const out = diffTableSets(["b", "a", "shared"], ["shared", "c"]);
    expect(out.onlyInSource).toEqual(["a", "b"]);
    expect(out.onlyInTarget).toEqual(["c"]);
    expect(out.shared).toEqual(["shared"]);
  });
});
