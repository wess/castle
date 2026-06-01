import type { DockerClient } from "../client.ts";

const enc = encodeURIComponent;

export const start = (client: DockerClient, id: string): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/start`);

export const stop = (client: DockerClient, id: string, timeout = 10): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/stop?t=${timeout}`);

export const restart = (client: DockerClient, id: string, timeout = 10): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/restart?t=${timeout}`);

export const pause = (client: DockerClient, id: string): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/pause`);

export const unpause = (client: DockerClient, id: string): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/unpause`);

export const kill = (client: DockerClient, id: string, signal = "SIGKILL"): Promise<void> =>
  client.call("POST", `/containers/${enc(id)}/kill?signal=${enc(signal)}`);

export const remove = (client: DockerClient, id: string, force = false): Promise<void> =>
  client.call("DELETE", `/containers/${enc(id)}?force=${force ? 1 : 0}&v=1`);
