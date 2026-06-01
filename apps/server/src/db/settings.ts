import type { Db } from "./init.ts";

export type SettingsMap = {
  auth_required: boolean;
  ollama_url: string;
  ollama_api_key: string;
  mcp_enabled: boolean;
  mcp_token: string;
};

export const defaults: SettingsMap = {
  auth_required: true,
  ollama_url: "http://localhost:11434",
  ollama_api_key: "",
  mcp_enabled: false,
  mcp_token: "",
};

const parse = <K extends keyof SettingsMap>(value: string, key: K): SettingsMap[K] => {
  if (typeof defaults[key] === "boolean") return (value === "true") as SettingsMap[K];
  return value as SettingsMap[K];
};

const serialize = (value: unknown): string => String(value);

export const getAll = async (db: Db): Promise<SettingsMap> => {
  const rows = (await db`SELECT key, value FROM settings`) as { key: string; value: string }[];
  const out: SettingsMap = { ...defaults };
  for (const r of rows) {
    if (r.key in defaults) (out as any)[r.key] = parse(r.value, r.key as keyof SettingsMap);
  }
  return out;
};

export const get = async <K extends keyof SettingsMap>(db: Db, key: K): Promise<SettingsMap[K]> => {
  const rows = (await db`SELECT value FROM settings WHERE key = ${key}`) as { value: string }[];
  const row = rows[0];
  if (!row) return defaults[key];
  return parse(row.value, key);
};

export const set = async <K extends keyof SettingsMap>(db: Db, key: K, value: SettingsMap[K]): Promise<void> => {
  const v = serialize(value);
  await db`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${key}, ${v}, EXTRACT(EPOCH FROM NOW())::BIGINT)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
};
