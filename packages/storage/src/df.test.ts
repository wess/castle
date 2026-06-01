import { describe, expect, test } from "bun:test";
import { parseDf } from "./df.ts";

describe("df parseDf", () => {
  const header = "Filesystem Type 1B-blocks Used Mounted on";

  test("parses df output, dropping the header row", () => {
    const out = `${header}\n/dev/sda1 ext4 1000 400 /\ntmpfs tmpfs 500 0 /run\n`;
    expect(parseDf(out)).toEqual([
      { source: "/dev/sda1", fstype: "ext4", totalBytes: 1000, usedBytes: 400, mount: "/" },
      { source: "tmpfs", fstype: "tmpfs", totalBytes: 500, usedBytes: 0, mount: "/run" },
    ]);
  });

  test("returns empty when only a header is present", () => {
    expect(parseDf(`${header}\n`)).toEqual([]);
  });

  test("skips malformed rows with too few columns", () => {
    const out = `${header}\n/dev/sda1 ext4 1000\n`;
    expect(parseDf(out)).toEqual([]);
  });
});
