import { listInstances } from "@castle/apps";
import { containers, images, info, networks, ping, volumes } from "@castle/docker";
import * as lxc from "@castle/lxc";
import { bridges } from "@castle/network";
import { createClient, models } from "@castle/ollama";
import { store as connectionsStore } from "../connections/index.ts";
import { settings } from "../db/index.ts";
import { store as domainsStore } from "../domains/index.ts";
import { collect } from "../host/stats.ts";
import { routes as routesStore, sites } from "../hosts/index.ts";
import * as pulls from "../ollama/jobs.ts";
import { app } from "../state.ts";
import { collectPools } from "../storage/index.ts";
import { store as usersStore } from "../users/index.ts";
import type { Topic } from "./topics.ts";

// Each snapshot returns EXACTLY what the matching web queryFn resolves to (some
// REST handlers wrap their body, e.g. `{ routes }`, and the client unwraps it).
// This is the one place that mirrors that unwrapping; the client just writes
// whatever arrives into its query cache.

const ollamaClient = async () => {
  const [url, apiKey] = await Promise.all([
    settings.get(app().db, "ollama_url"),
    settings.get(app().db, "ollama_api_key"),
  ]);
  return createClient(url, { apiKey: apiKey || undefined });
};

const engine = async () => {
  const docker = app().docker;
  if (!(await ping(docker))) return { docker: { online: false } };
  return { docker: { online: true, ...(await info(docker)) } };
};

const usersWithProvisions = async () => {
  const db = app().db;
  const users = await usersStore.list(db);
  const provisions =
    (await db`SELECT user_id, app_id, instance, status, error, provisioned_at FROM user_app_provisions`) as Array<{
      user_id: number;
      app_id: string;
      instance: string;
      status: string;
      error: string | null;
      provisioned_at: number;
    }>;
  const byUser = new Map<number, Array<Record<string, unknown>>>();
  for (const p of provisions) {
    const list = byUser.get(p.user_id) ?? [];
    list.push({ appId: p.app_id, instance: p.instance, status: p.status, error: p.error, at: p.provisioned_at });
    byUser.set(p.user_id, list);
  }
  return users.map((u) => ({ ...u, provisions: byUser.get(u.id) ?? [] }));
};

const connectionsSafe = async () => {
  const rows = await connectionsStore.list(app().db);
  return rows.map(({ token: _t, ...rest }) => rest);
};

export const SNAPSHOTS: Record<Topic, () => Promise<unknown>> = {
  host: () => collect(),
  engine,
  containers: () => containers.list(app().docker, true),
  lxc: () => lxc.list(),
  images: () => images.list(app().docker),
  networks: async () => {
    const [docker, host] = await Promise.all([networks.list(app().docker), bridges.list()]);
    return { docker, host };
  },
  pools: () => collectPools(app().db),
  volumes: () => volumes.list(app().docker),
  domains: async () => ({ entries: await domainsStore.list() }),
  routes: () => routesStore.list(app().db),
  "nginx-sites": () => sites.list(),
  users: usersWithProvisions,
  connections: connectionsSafe,
  apps: () => listInstances(app().docker),
  "ollama:status": async () => {
    const client = await ollamaClient();
    return { ok: await models.ping(client), url: client.base };
  },
  "ollama:models": async () => {
    const client = await ollamaClient();
    return models.list(client);
  },
  "ollama:pulls": async () => pulls.list(),
};
