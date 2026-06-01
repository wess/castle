import type { HostStats } from "@castle/core";
import { get } from "./client.ts";

export type EngineStatus = {
  docker: { online: boolean; ServerVersion?: string; Containers?: number; Images?: number };
};

export const host = () => get<HostStats>("/host");
export const engine = () => get<EngineStatus>("/host/engine");
