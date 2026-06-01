import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { add, ensureLocal, list, remove, write } from "./store.ts";

describe("ensureLocal", () => {
  test("appends .local", () => {
    expect(ensureLocal("nas")).toBe("nas.local");
  });

  test("keeps an existing .local", () => {
    expect(ensureLocal("MEDIA.local")).toBe("media.local");
  });

  test("throws on empty input", () => {
    expect(() => ensureLocal("  ")).toThrow("empty hostname");
  });

  test("throws on an invalid hostname", () => {
    expect(() => ensureLocal("bad host")).toThrow("invalid hostname");
  });
});

describe("alias file store", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "castle-aliases-"));
    file = join(dir, "aliases");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("list returns empty when the file is missing", async () => {
    expect(await list(file)).toEqual([]);
  });

  test("add writes a normalized host and is idempotent", async () => {
    const first = await add("nas", file);
    expect(first).toEqual(["nas.local"]);
    const second = await add("nas", file);
    expect(second).toEqual(["nas.local"]);
  });

  test("write dedupes, trims, and sorts entries", async () => {
    await write([" b.local ", "a.local", "a.local"], file);
    expect(await list(file)).toEqual(["a.local", "b.local"]);
  });

  test("list strips comments and blank lines", async () => {
    await Bun.write(file, "# header\na.local\n\n  b.local # inline\n");
    expect(await list(file)).toEqual(["a.local", "b.local"]);
  });

  test("remove deletes a host and persists the change", async () => {
    await add("a", file);
    await add("b", file);
    const next = await remove("a", file);
    expect(next).toEqual(["b.local"]);
    expect(await readFile(file, "utf8")).toBe("b.local\n");
  });

  test("remove is a no-op for an absent host", async () => {
    await add("a", file);
    const next = await remove("zzz", file);
    expect(next).toEqual(["a.local"]);
  });
});
