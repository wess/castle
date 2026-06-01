import { del, get, patch, post } from "./client.ts";

export type Provision = {
  appId: string;
  instance: string;
  status: "ok" | "error";
  error: string | null;
  at: number;
};

export type User = {
  id: number;
  email: string;
  username: string;
  name: string;
  created_at: number;
  provisions: Provision[];
};

export type ProvisionResult = {
  appId: string;
  instance: string;
  ok: boolean;
  error: string | null;
};

export type CreateInput = {
  email: string;
  password: string;
  username?: string;
  name?: string;
};

export const list = () => get<{ users: User[] }>("/users").then((r) => r.users);
export const create = (input: CreateInput) => post<{ user: User; provisions: ProvisionResult[] }>("/users", input);
export const setPassword = (id: number, password: string) =>
  patch<{ user: User; provisions: ProvisionResult[] }>(`/users/${id}/password`, { password });
export const sync = (id: number) => post<{ user: User; provisions: ProvisionResult[] }>(`/users/${id}/sync`);
export const remove = (id: number) =>
  del<{ ok: boolean; deleted: number; provisions: ProvisionResult[] }>(`/users/${id}`);
