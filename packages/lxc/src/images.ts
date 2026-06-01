import { exec } from "./exec.ts";

export type LxcImage = {
  dist: string;
  release: string;
  arch: string;
  variant: string;
};

export const images = async (): Promise<LxcImage[]> => {
  const r = await exec(["lxc-create", "-n", "_castletmpprobe", "-t", "download", "--", "--list"]);
  if (r.code !== 0) return [];
  const lines = r.stdout.split("\n");
  const out: LxcImage[] = [];
  let start = false;
  for (const line of lines) {
    if (line.startsWith("---")) {
      start = true;
      continue;
    }
    if (!start) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const [dist, release, arch, variant] = parts;
    if (!dist || !release || !arch || !variant) continue;
    out.push({ dist, release, arch, variant });
  }
  return out;
};
