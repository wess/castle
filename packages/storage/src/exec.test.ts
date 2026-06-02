import { expect, test } from "bun:test";
import { exec } from "./exec.ts";

test("returns code 127 instead of throwing when the binary is missing", async () => {
  const r = await exec(["castle-definitely-not-a-real-binary-xyz"]);
  expect(r.code).not.toBe(0);
  expect(r.stdout).toBe("");
});

test("runs a real command and captures stdout", async () => {
  const r = await exec(["echo", "hi"]);
  expect(r.code).toBe(0);
  expect(r.stdout.trim()).toBe("hi");
});
