import { describe, expect, test } from "bun:test";
import { id } from "./id.ts";

describe("id", () => {
  test("applies the prefix", () => {
    expect(id("wl")).toMatch(/^wl_[0-9a-f]{24}$/);
  });

  test("encodes 12 random bytes as 24 hex chars", () => {
    const value = id("x");
    const hex = value.split("_")[1] ?? "";
    expect(hex).toHaveLength(24);
  });

  test("produces distinct values", () => {
    const seen = new Set(Array.from({ length: 100 }, () => id("n")));
    expect(seen.size).toBe(100);
  });
});
