import type { Pool } from "@castle/core";
import { df } from "./df.ts";

export const fromPath = async (name: string, path: string): Promise<Pool | null> => {
  const entries = await df(path);
  const entry = entries[0];
  if (!entry) return null;
  return {
    id: `dir:${name}`,
    name,
    kind: "dir",
    path,
    totalBytes: entry.totalBytes,
    usedBytes: entry.usedBytes,
  };
};
