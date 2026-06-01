import type { Workload } from "@castle/core";
import { del, get, post } from "./client.ts";

export type CreateLxcInput = {
  name: string;
  distro: string;
  release: string;
  arch: string;
};

export const list = () => get<Workload[]>("/lxc");
export const inspect = (name: string) => get<any>(`/lxc/${name}`);
export const create = (input: CreateLxcInput) => post<{ name: string }>("/lxc", input);
export const start = (name: string) => post(`/lxc/${name}/start`);
export const stop = (name: string) => post(`/lxc/${name}/stop`);
export const destroy = (name: string, force = false) => del(`/lxc/${name}?force=${force ? 1 : 0}`);
