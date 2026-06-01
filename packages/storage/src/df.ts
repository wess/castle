import { exec } from "./exec.ts";

export type DfEntry = {
  source: string;
  fstype: string;
  totalBytes: number;
  usedBytes: number;
  mount: string;
};

export const parseDf = (stdout: string): DfEntry[] => {
  const lines = stdout.split("\n").slice(1).filter(Boolean);
  return lines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) return null;
      const [source, fstype, size, used, mount] = parts;
      if (!source || !fstype || !mount) return null;
      return {
        source,
        fstype,
        totalBytes: Number(size),
        usedBytes: Number(used),
        mount,
      } satisfies DfEntry;
    })
    .filter((x): x is DfEntry => x !== null);
};

export const df = async (path?: string): Promise<DfEntry[]> => {
  const cmd = ["df", "-B1", "--output=source,fstype,size,used,target"];
  if (path) cmd.push(path);
  const r = await exec(cmd);
  if (r.code !== 0) return [];
  return parseDf(r.stdout);
};
