import { describe, expect, test } from "bun:test";
import { parseSteps, serializeSteps } from "./macrosteps.ts";

const steps = [
  { action: "query", params: { sql: "select 1" } },
  { action: "navigate", params: { table: "users" } },
];

describe("serializeSteps", () => {
  test("serializes an array of steps to JSON", () => {
    expect(serializeSteps(steps)).toBe(JSON.stringify(steps));
  });

  test("coerces non-arrays to an empty array", () => {
    expect(serializeSteps(undefined)).toBe("[]");
    expect(serializeSteps(null)).toBe("[]");
    expect(serializeSteps({ action: "query" })).toBe("[]");
  });
});

describe("parseSteps", () => {
  test("round-trips a serialized step list", () => {
    expect(parseSteps(serializeSteps(steps))).toEqual(steps);
  });

  test("passes through an already-parsed array", () => {
    expect(parseSteps(steps)).toEqual(steps);
  });

  test("falls back to empty on malformed or non-array json", () => {
    expect(parseSteps("not json")).toEqual([]);
    expect(parseSteps('{"action":"query"}')).toEqual([]);
    expect(parseSteps(42)).toEqual([]);
  });
});
