import { describe, expect, test } from "bun:test";
import { escapeCsv, mimeFor, serialize, sqlValue } from "./export.ts";

const columns = ["id", "name"];
const rows = [
  { id: 1, name: "ada" },
  { id: 2, name: "bob" },
];

describe("escapeCsv", () => {
  test("renders null/undefined as empty", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });
  test("quotes commas, quotes, and newlines", () => {
    expect(escapeCsv("x,y")).toBe('"x,y"');
    expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCsv("a\nb")).toBe('"a\nb"');
  });
  test("leaves plain values untouched", () => {
    expect(escapeCsv("plain")).toBe("plain");
    expect(escapeCsv(42)).toBe("42");
  });
});

describe("sqlValue", () => {
  test("formats nulls, numbers, booleans, strings", () => {
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(undefined)).toBe("NULL");
    expect(sqlValue(7)).toBe("7");
    expect(sqlValue(true)).toBe("TRUE");
    expect(sqlValue(false)).toBe("FALSE");
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });
});

describe("serialize csv", () => {
  test("includes headers by default", () => {
    expect(serialize("csv", "users", columns, rows, true)).toBe("id,name\r\n1,ada\r\n2,bob");
  });
  test("omits headers when disabled", () => {
    expect(serialize("csv", "users", columns, rows, false)).toBe("1,ada\r\n2,bob");
  });
});

describe("serialize json", () => {
  test("emits pretty json of rows", () => {
    expect(serialize("json", "users", columns, rows, true)).toBe(JSON.stringify(rows, null, 2));
  });
});

describe("serialize sql", () => {
  test("emits one quoted insert per row", () => {
    const out = serialize("sql", "users", columns, rows, true);
    expect(out).toBe(
      `INSERT INTO "users" ("id", "name") VALUES (1, 'ada');\n` +
        `INSERT INTO "users" ("id", "name") VALUES (2, 'bob');`,
    );
  });
  test("escapes identifiers and values", () => {
    const out = serialize("sql", 'we"ird', ['c"x'], [{ 'c"x': "a'b" }], true);
    expect(out).toBe(`INSERT INTO "we""ird" ("c""x") VALUES ('a''b');`);
  });
});

describe("mimeFor", () => {
  test("maps each format", () => {
    expect(mimeFor("csv")).toBe("text/csv");
    expect(mimeFor("json")).toBe("application/json");
    expect(mimeFor("sql")).toBe("application/sql");
  });
});
