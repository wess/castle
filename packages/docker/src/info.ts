import type { DockerClient } from "./client.ts";

export type EngineInfo = {
  ID: string;
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  ServerVersion: string;
  KernelVersion: string;
  OperatingSystem: string;
  Architecture: string;
  NCPU: number;
  MemTotal: number;
};

export const info = (client: DockerClient): Promise<EngineInfo> => client.call<EngineInfo>("GET", "/info");

export const version = (client: DockerClient): Promise<unknown> => client.call("GET", "/version");

export const ping = async (client: DockerClient): Promise<boolean> => {
  try {
    const res = await client.raw("GET", "/_ping");
    return res.ok;
  } catch {
    return false;
  }
};
