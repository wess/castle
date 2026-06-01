import { del, get, post } from "./client.ts";

export type AppTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  docs?: string;
  multi: boolean;
};

export type AppInstance = {
  appId: string;
  name: string;
  hostname: string;
  primaryPort: number;
  primaryUrl: string;
  containers: Array<{ id: string; name: string; service: string }>;
  createdAt: string;
};

export const list = () => get<{ apps: AppTemplate[] }>("/apps").then((r) => r.apps);
export const installed = () => get<{ instances: AppInstance[] }>("/apps/installed").then((r) => r.instances);
export const install = (input: { appId: string; name: string; inputs?: Record<string, string> }) =>
  post<{ instance: AppInstance }>("/apps/install", input);
export const uninstall = (name: string) => del(`/apps/${encodeURIComponent(name)}`);
