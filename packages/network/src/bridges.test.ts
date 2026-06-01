import { describe, expect, test } from "bun:test";
import { parseLinks } from "./bridges.ts";

describe("bridges parseLinks", () => {
  test("maps ip -j link output to bridge networks", () => {
    const out = JSON.stringify([
      { ifname: "br0", ifindex: 2, operstate: "UP", flags: [] },
      { ifname: "docker0", ifindex: 3, operstate: "DOWN", flags: [] },
    ]);
    expect(parseLinks(out)).toEqual([
      { id: "bridge:br0", name: "br0", kind: "bridge", driver: "linux-bridge", attached: 0 },
      { id: "bridge:docker0", name: "docker0", kind: "bridge", driver: "linux-bridge", attached: 0 },
    ]);
  });

  test("returns empty on invalid json", () => {
    expect(parseLinks("not json")).toEqual([]);
  });

  test("returns empty when output is not an array", () => {
    expect(parseLinks('{"ifname":"br0"}')).toEqual([]);
  });

  test("returns empty for an empty array", () => {
    expect(parseLinks("[]")).toEqual([]);
  });
});
