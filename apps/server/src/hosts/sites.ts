import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const AVAILABLE_DIR = process.env.NGINX_SITES_AVAILABLE ?? "/etc/nginx/sites-available";
const ENABLED_DIR = process.env.NGINX_SITES_ENABLED ?? "/etc/nginx/sites-enabled";

export type ManualSite = {
  name: string;
  enabled: boolean;
  serverNames: string[];
  path: string;
};

const safeName = (name: string): string => {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error(`invalid site name: ${name}`);
  return name;
};

const parseServerNames = (config: string): string[] => {
  const names: string[] = [];
  const re = /^\s*server_name\s+([^;]+);/gm;
  let m: RegExpExecArray | null;
  m = re.exec(config);
  while (m) {
    const parts = m[1]!.split(/\s+/).filter(Boolean);
    for (const p of parts) if (p && p !== "_") names.push(p);
    m = re.exec(config);
  }
  return [...new Set(names)];
};

export const list = async (): Promise<ManualSite[]> => {
  const files = await readdir(AVAILABLE_DIR).catch(() => [] as string[]);
  const enabled = new Set(await readdir(ENABLED_DIR).catch(() => [] as string[]));
  const out: ManualSite[] = [];
  for (const name of files) {
    if (name.startsWith(".")) continue;
    const path = join(AVAILABLE_DIR, name);
    try {
      const stat = await lstat(path);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }
    const raw = await readFile(path, "utf8").catch(() => "");
    out.push({
      name,
      enabled: enabled.has(name),
      serverNames: parseServerNames(raw),
      path,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
};

export const read = async (name: string): Promise<string> => {
  const safe = safeName(name);
  return readFile(join(AVAILABLE_DIR, safe), "utf8");
};

const runHelper = async (action: "enable" | "disable", name: string): Promise<void> => {
  const safe = safeName(name);
  const proc = Bun.spawn(["sudo", "-n", "/usr/local/bin/castle-nginx-site", action, safe], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`castle-nginx-site ${action} ${safe} → exit ${code}: ${err.trim()}`);
  }
};

export const enable = (name: string): Promise<void> => runHelper("enable", name);
export const disable = (name: string): Promise<void> => runHelper("disable", name);
