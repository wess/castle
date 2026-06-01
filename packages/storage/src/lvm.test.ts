import { describe, expect, test } from "bun:test";
import { parsePools } from "./lvm.ts";

describe("lvm parsePools", () => {
  test("parses vgs output into pools", () => {
    const out = "  vg0 1000000 250000\n  data 500 100\n";
    expect(parsePools(out)).toEqual([
      { id: "lvm:vg0", name: "vg0", kind: "lvm", path: "/dev/vg0", totalBytes: 1000000, usedBytes: 750000 },
      { id: "lvm:data", name: "data", kind: "lvm", path: "/dev/data", totalBytes: 500, usedBytes: 400 },
    ]);
  });

  test("ignores blank lines", () => {
    expect(parsePools("\n\n")).toEqual([]);
  });

  test("skips lines with too few columns", () => {
    expect(parsePools("vg0 1000\n")).toEqual([]);
  });

  test("computes used as size minus free", () => {
    const [pool] = parsePools("pool 80 30");
    expect(pool?.usedBytes).toBe(50);
  });
});
