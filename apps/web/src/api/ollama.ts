import { getToken } from "../auth/storage.ts";
import { del, get, patch, post, put } from "./client.ts";

export type OllamaModel = {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
};

export const status = () => get<{ ok: boolean; url: string }>("/ollama/status");
export const list = () => get<{ models: OllamaModel[] }>("/ollama/models").then((r) => r.models);
export const remove = (name: string) => del(`/ollama/models/${encodeURIComponent(name)}`);
export type OllamaSettings = { url: string; apiKey: string };
export const settings = () => get<OllamaSettings>("/ollama/settings");
export const saveSettings = (s: OllamaSettings) => put<OllamaSettings>("/ollama/settings", s);

export type PullJob = {
  model: string;
  status: "running" | "success" | "error" | "cancelled";
  step: string;
  total: number;
  completed: number;
  startedAt: number;
  endedAt: number | null;
  error: string | null;
};

export const startPull = (name: string) => post<{ job: PullJob }>("/ollama/pull", { name }).then((r) => r.job);
export const listPulls = () => get<{ pulls: PullJob[] }>("/ollama/pulls").then((r) => r.pulls);
export const cancelPull = (name: string) => del<{ cancelled: boolean }>(`/ollama/pulls/${encodeURIComponent(name)}`);

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
};
export type Chat = ChatSummary & { messages: ChatMessage[] };

export const listChats = () => get<{ chats: ChatSummary[] }>("/ollama/chats").then((r) => r.chats);
export const getChat = (id: string) => get<{ chat: Chat }>(`/ollama/chats/${id}`).then((r) => r.chat);
export const createChat = (input: { title: string; model: string; messages: ChatMessage[] }) =>
  post<{ chat: Chat }>("/ollama/chats", input).then((r) => r.chat);
export const updateChat = (id: string, input: Partial<{ title: string; model: string; messages: ChatMessage[] }>) =>
  patch<{ chat: Chat }>(`/ollama/chats/${id}`, input).then((r) => r.chat);
export const deleteChat = (id: string) => del(`/ollama/chats/${id}`);

export const chatStream = async (
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<ReadableStream<Uint8Array>> => {
  const token = getToken();
  const res = await fetch("/api/ollama/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok || !res.body) throw new Error(`chat → ${res.status}`);
  return res.body;
};
