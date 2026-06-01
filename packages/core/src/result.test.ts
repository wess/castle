import { describe, expect, test } from "bun:test";
import { err, map, ok, type Result, unwrap } from "./result.ts";

describe("result", () => {
  test("ok wraps a value", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(42);
  });

  test("err wraps an error", () => {
    const r = err("boom");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("boom");
  });

  test("map transforms an ok value", () => {
    const r = map(ok(2), (n) => n * 3);
    expect(r).toEqual({ ok: true, value: 6 });
  });

  test("map passes an err through untouched", () => {
    const r: Result<number, string> = err("nope");
    expect(map(r, (n) => n * 3)).toEqual({ ok: false, error: "nope" });
  });

  test("unwrap returns the value for ok", () => {
    expect(unwrap(ok("hi"))).toBe("hi");
  });

  test("unwrap throws for err", () => {
    expect(() => unwrap(err("dead"))).toThrow("dead");
  });
});
