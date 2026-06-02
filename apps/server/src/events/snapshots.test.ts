import { expect, test } from "bun:test";
import { SNAPSHOTS } from "./snapshots.ts";
import { TOPICS } from "./topics.ts";

test("every topic has a snapshot producer", () => {
  for (const topic of TOPICS) {
    expect(typeof SNAPSHOTS[topic]).toBe("function");
  }
});

test("snapshots map has no topics beyond the registry", () => {
  const known = new Set<string>(TOPICS);
  for (const key of Object.keys(SNAPSHOTS)) {
    expect(known.has(key)).toBe(true);
  }
});
