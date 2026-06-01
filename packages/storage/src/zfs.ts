import type { Pool } from "@castle/core";
import { exec } from "./exec.ts";

export const parsePools = (stdout: string): Pool[] =>
  stdout
    .split("\n")
    .filter(Boolean)
    .map((line): Pool | null => {
      const [name, size, alloc] = line.split("\t");
      if (!name) return null;
      return {
        id: `zfs:${name}`,
        name,
        kind: "zfs",
        path: `/${name}`,
        totalBytes: Number(size),
        usedBytes: Number(alloc),
      };
    })
    .filter((x): x is Pool => x !== null);

export const pools = async (): Promise<Pool[]> => {
  const r = await exec(["zpool", "list", "-Hp", "-o", "name,size,alloc,health"]);
  if (r.code !== 0) return [];
  return parsePools(r.stdout);
};
