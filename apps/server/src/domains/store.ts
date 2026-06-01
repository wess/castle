import { readFile, writeFile } from "node:fs/promises";

const ALIAS_FILE = "/etc/castle/mdns-aliases";

const looksLikeHostname = (s: string): boolean =>
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(s);

export const ensureLocal = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) throw new Error("empty hostname");
  const host = trimmed.endsWith(".local") ? trimmed : `${trimmed}.local`;
  if (!looksLikeHostname(host)) throw new Error("invalid hostname");
  return host;
};

export const list = async (path: string = ALIAS_FILE): Promise<string[]> => {
  try {
    const text = await readFile(path, "utf8");
    return text
      .split("\n")
      .map((s) => s.replace(/#.*$/, "").trim())
      .filter(Boolean);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
};

export const write = async (entries: string[], path: string = ALIAS_FILE): Promise<void> => {
  const unique = Array.from(new Set(entries.map((e) => e.trim()).filter(Boolean)));
  unique.sort();
  await writeFile(path, `${unique.join("\n")}\n`, { mode: 0o664 });
};

export const add = async (name: string, path: string = ALIAS_FILE): Promise<string[]> => {
  const host = ensureLocal(name);
  const current = await list(path);
  if (current.includes(host)) return current;
  const next = [...current, host];
  await write(next, path);
  return next;
};

export const remove = async (name: string, path: string = ALIAS_FILE): Promise<string[]> => {
  const host = ensureLocal(name);
  const current = await list(path);
  const next = current.filter((c) => c !== host);
  if (next.length === current.length) return current;
  await write(next, path);
  return next;
};
