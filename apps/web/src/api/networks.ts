import type { Network } from "@castle/core";
import { del, get, post } from "./client.ts";

export const list = () => get<{ docker: Network[]; host: Network[] }>("/networks");
export const createDocker = (name: string, driver = "bridge") =>
  post<{ Id: string }>("/networks/docker", { name, driver });
export const createBridge = (name: string) => post(`/networks/bridges`, { name });
export const removeDocker = (id: string) => del(`/networks/docker/${id}`);
export const removeBridge = (name: string) => del(`/networks/bridges/${name}`);
