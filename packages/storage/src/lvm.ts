import type { Pool } from "@castle/core";
import { exec } from "./exec.ts";

export const parsePools = (stdout: string): Pool[] =>
  stdout
    .split("\n")
    .filter(Boolean)
    .map((line): Pool | null => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return null;
      const [name, size, free] = parts;
      if (!name || !size || !free) return null;
      const total = Number(size);
      const usedBytes = total - Number(free);
      return {
        id: `lvm:${name}`,
        name,
        kind: "lvm",
        path: `/dev/${name}`,
        totalBytes: total,
        usedBytes,
      };
    })
    .filter((x): x is Pool => x !== null);

export const pools = async (): Promise<Pool[]> => {
  const r = await exec(["vgs", "--units", "b", "--nosuffix", "--noheadings", "-o", "vg_name,vg_size,vg_free"]);
  if (r.code !== 0) return [];
  return parsePools(r.stdout);
};
