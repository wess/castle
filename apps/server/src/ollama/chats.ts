import type { Db } from "../db/index.ts";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRow = {
  id: string;
  user_id: number;
  title: string;
  model: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
};

export type ChatSummary = Omit<ChatRow, "messages">;

const now = () => Math.floor(Date.now() / 1000);

const randomId = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const parseMessages = (raw: unknown): ChatMessage[] => {
  if (Array.isArray(raw)) return raw as ChatMessage[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalize = (row: ChatRow): ChatRow => ({ ...row, messages: parseMessages(row.messages) });

export const list = async (db: Db, userId: number): Promise<ChatSummary[]> => {
  const rows = (await db`
    SELECT id, user_id, title, model, created_at, updated_at
    FROM ollama_chats
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 200
  `) as ChatSummary[];
  return rows;
};

export const get = async (db: Db, userId: number, id: string): Promise<ChatRow | null> => {
  const rows = (await db`
    SELECT id, user_id, title, model, messages, created_at, updated_at
    FROM ollama_chats
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `) as ChatRow[];
  const row = rows[0];
  return row ? normalize(row) : null;
};

export const create = async (
  db: Db,
  userId: number,
  input: { title: string; model: string; messages: ChatMessage[] },
): Promise<ChatRow> => {
  const id = randomId();
  const t = now();
  await db`
    INSERT INTO ollama_chats (id, user_id, title, model, messages, created_at, updated_at)
    VALUES (${id}, ${userId}, ${input.title}, ${input.model}, ${JSON.stringify(input.messages)}::JSONB, ${t}, ${t})
  `;
  return {
    id,
    user_id: userId,
    title: input.title,
    model: input.model,
    messages: input.messages,
    created_at: t,
    updated_at: t,
  };
};

export const update = async (
  db: Db,
  userId: number,
  id: string,
  patch: { title?: string; model?: string; messages?: ChatMessage[] },
): Promise<ChatRow | null> => {
  const existing = await get(db, userId, id);
  if (!existing) return null;
  const title = patch.title ?? existing.title;
  const model = patch.model ?? existing.model;
  const messages = patch.messages ?? existing.messages;
  const t = now();
  await db`
    UPDATE ollama_chats
    SET title = ${title},
        model = ${model},
        messages = ${JSON.stringify(messages)}::JSONB,
        updated_at = ${t}
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return { ...existing, title, model, messages, updated_at: t };
};

export const remove = async (db: Db, userId: number, id: string): Promise<void> => {
  await db`DELETE FROM ollama_chats WHERE id = ${id} AND user_id = ${userId}`;
};
