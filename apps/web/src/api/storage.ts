import type { Pool } from "@castle/core";
import { del, get, post } from "./client.ts";

export type Volume = {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  UsageData?: { Size: number; RefCount: number };
};

export const pools = () => get<Pool[]>("/storage/pools");
export const volumes = () => get<Volume[]>("/storage/volumes");
export const createVolume = (name: string) => post<Volume>(`/storage/volumes`, { name });
export const removeVolume = (name: string, force = false) => del(`/storage/volumes/${name}?force=${force ? 1 : 0}`);
