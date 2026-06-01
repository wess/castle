import type { OllamaClient } from "./client.ts";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  options?: Record<string, unknown>;
};

export type ChatChunk = {
  model: string;
  created_at: string;
  message?: ChatMessage;
  done: boolean;
  done_reason?: string;
};

export const chat = async (client: OllamaClient, req: ChatRequest): Promise<ReadableStream<Uint8Array>> => {
  const res = await client.raw("POST", "/api/chat", { ...req, stream: true });
  if (!res.ok || !res.body) throw new Error(`chat ${req.model} → ${res.status}`);
  return res.body;
};
