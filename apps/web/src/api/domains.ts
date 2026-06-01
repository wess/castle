import { del, get, post } from "./client.ts";

export type DomainResponse = {
  entries: string[];
  reloaded?: boolean;
  error?: string;
};

export const list = () => get<DomainResponse>("/domains");
export const add = (name: string) => post<DomainResponse>("/domains", { name });
export const remove = (name: string) => del<DomainResponse>(`/domains/${encodeURIComponent(name)}`);
export const reload = () => post<{ reloaded: boolean; error?: string }>("/domains/reload");
