import { describe, expect, test } from "bun:test";
import { parsePools } from "./zfs.ts";

describe("zfs parsePools", () => {
  test("parses tab-separated zpool output", () => {
    const out = "tank\t1000\t400\tONLINE\nbackup\t500\t50\tONLINE\n";
    expect(parsePools(out)).toEqual([
      { id: "zfs:tank", name: "tank", kind: "zfs", path: "/tank", totalBytes: 1000, usedBytes: 400 },
      { id: "zfs:backup", name: "backup", kind: "zfs", path: "/backup", totalBytes: 500, usedBytes: 50 },
    ]);
  });

  test("ignores empty output", () => {
    expect(parsePools("")).toEqual([]);
  });

  test("skips lines without a name", () => {
    expect(parsePools("\t100\t50\tONLINE")).toEqual([]);
  });
});
