import type { Workload } from "@castle/core";
import { del, get, post } from "./client.ts";

export type CreateContainerInput = {
  name: string;
  image: string;
  cmd?: string[];
  env?: string[];
  ports?: { host: number; container: number; protocol?: "tcp" | "udp" }[];
  mounts?: { source: string; target: string; readonly?: boolean }[];
  restart?: "no" | "always" | "unless-stopped" | "on-failure";
};

export const list = () => get<Workload[]>("/containers");
export const inspect = (id: string) => get<any>(`/containers/${id}`);
export const create = (input: CreateContainerInput) => post<{ id: string }>("/containers", input);
export const start = (id: string) => post(`/containers/${id}/start`);
export const stop = (id: string) => post(`/containers/${id}/stop`);
export const restart = (id: string) => post(`/containers/${id}/restart`);
export const remove = (id: string, force = false) => del(`/containers/${id}?force=${force ? 1 : 0}`);
