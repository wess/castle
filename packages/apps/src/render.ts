import type { AppService, AppTemplate } from "./types.ts";

const VAR_RE = /\$\{([A-Z_]+)(?::([A-Z_]+))?\}/g;

export type RenderContext = {
  instance: string;
  secrets: Record<string, string>;
  inputs: Record<string, string>;
};

export const collectSecretKeys = (tpl: AppTemplate): string[] => {
  const keys = new Set<string>();
  for (const s of tpl.services) for (const k of s.generateSecrets ?? []) keys.add(k);
  return [...keys];
};

const randomHex = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const generateSecrets = (keys: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = randomHex(32);
  return out;
};

export const expand = (raw: string, ctx: RenderContext): string =>
  raw.replace(VAR_RE, (_, scope, key) => {
    if (!key) {
      if (scope === "INSTANCE") return ctx.instance;
      return ctx.inputs[scope] ?? "";
    }
    if (scope === "SECRET") return ctx.secrets[key] ?? "";
    if (scope === "INPUT") return ctx.inputs[key] ?? "";
    return "";
  });

export const renderEnv = (env: Record<string, string> | undefined, ctx: RenderContext): string[] => {
  if (!env) return [];
  return Object.entries(env).map(([k, v]) => `${k}=${expand(v, ctx)}`);
};

export const containerName = (instance: string, service: AppService): string =>
  service.role === "primary" ? instance : `${instance}-${service.key}`;
