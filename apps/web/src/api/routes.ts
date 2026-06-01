import { del, get, post, put } from "./client.ts";

export type Location = {
  pattern: string;
  backend: string;
  websocket: boolean;
};

export type HostRoute = {
  hostname: string;
  backend: string;
  websocket: boolean;
  locations: Location[];
  created_at: number;
  updated_at: number;
};

export type RouteMutation = {
  route: HostRoute;
  nginx: boolean;
  mdns: boolean;
  error?: string;
};

export type RouteInput = {
  hostname: string;
  backend: string;
  websocket: boolean;
  locations?: Location[];
};

export const list = () => get<{ routes: HostRoute[] }>("/routes").then((r) => r.routes);
export const create = (input: RouteInput) => post<RouteMutation>("/routes", input);
export const update = (hostname: string, input: Omit<RouteInput, "hostname">) =>
  put<RouteMutation>(`/routes/${encodeURIComponent(hostname)}`, input);
export const remove = (hostname: string) => del(`/routes/${encodeURIComponent(hostname)}`);

export type ManualSite = {
  name: string;
  enabled: boolean;
  serverNames: string[];
  path: string;
};

export const listSites = () => get<{ sites: ManualSite[] }>("/nginx/sites").then((r) => r.sites);
export const readSite = (name: string) =>
  get<{ name: string; raw: string }>(`/nginx/sites/${encodeURIComponent(name)}`);
export const enableSite = (name: string) => post<{ ok: boolean }>(`/nginx/sites/${encodeURIComponent(name)}/enable`);
export const disableSite = (name: string) => post<{ ok: boolean }>(`/nginx/sites/${encodeURIComponent(name)}/disable`);
