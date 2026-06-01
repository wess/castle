import type { OllamaClient } from "./client.ts";

export type OllamaModel = {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
};

export type PullProgress = {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
};

export const list = async (client: OllamaClient): Promise<OllamaModel[]> => {
  const res = await client.call<{ models: OllamaModel[] }>("GET", "/api/tags");
  return res.models ?? [];
};

export const remove = async (client: OllamaClient, name: string): Promise<void> => {
  await client.call("DELETE", "/api/delete", { name });
};

export const pull = async (client: OllamaClient, name: string): Promise<ReadableStream<Uint8Array>> => {
  const res = await client.raw("POST", "/api/pull", { name, stream: true });
  if (!res.ok || !res.body) throw new Error(`pull ${name} → ${res.status}`);
  return res.body;
};

export const ping = async (client: OllamaClient): Promise<boolean> => {
  try {
    const res = await client.raw("GET", "/");
    return res.ok;
  } catch {
    return false;
  }
};
