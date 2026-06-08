import { get, request } from "./client.ts";

export type Settings = {
  auth_required: boolean;
};

export type AuthStatus = {
  authRequired: boolean;
  needsSetup?: boolean;
  ollama?: boolean;
  user?: { id: number; email: string };
};

export const status = () => get<AuthStatus>("/auth/status");

export const read = () => get<Settings>("/settings");

export const update = (patch: Partial<Settings>) =>
  request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(patch) });
