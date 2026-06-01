import { del, get, post } from "./client.ts";

export type Connection = {
  id: number;
  appId: "tangle" | "stohr";
  instance: string;
  hostname: string;
  managed: boolean;
  created_at: number;
};

export type CreateInput = {
  appId: "tangle" | "stohr";
  instance: string;
  hostname: string;
  token: string;
};

export const list = () => get<{ connections: Connection[] }>("/connections").then((r) => r.connections);

export const create = (input: CreateInput) => post<{ connection: Connection }>("/connections", input);

export const check = (id: number) => post<{ ok: boolean; error: string | null }>(`/connections/${id}/check`);

export const remove = (id: number) => del<{ ok: boolean; deleted: number }>(`/connections/${id}`);
