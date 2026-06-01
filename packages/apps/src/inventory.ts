import { type DockerClient, containers as dc } from "@castle/docker";
import { catalog, findApp } from "./catalog.ts";
import type { AppInstance } from "./types.ts";

type GroupedInstance = {
  appId: string;
  instance: string;
  containers: Array<{ id: string; name: string; service: string; running: boolean; ports: number[] }>;
};

export const listInstances = async (client: DockerClient): Promise<AppInstance[]> => {
  const all = await dc.list(client, true);
  const groups = new Map<string, GroupedInstance>();

  for (const w of all) {
    const appId = w.labels["castle.app"];
    const instance = w.labels["castle.instance"];
    const service = w.labels["castle.service"];
    if (!appId || !instance || !service) continue;
    const key = `${appId}/${instance}`;
    if (!groups.has(key)) groups.set(key, { appId, instance, containers: [] });
    groups.get(key)!.containers.push({
      id: w.id,
      name: w.name,
      service,
      running: w.state === "running",
      ports: w.ports.map((p) => p.host),
    });
  }

  const result: AppInstance[] = [];
  for (const g of groups.values()) {
    const tpl = findApp(g.appId);
    if (!tpl) continue;
    const primarySvc = tpl.services.find((s) => s.role === "primary");
    const primaryContainer = g.containers.find((c) => c.service === primarySvc?.key);
    const primaryHostPort = primaryContainer?.ports[0] ?? 0;
    result.push({
      appId: g.appId,
      name: g.instance,
      hostname: `${g.instance}.local`,
      primaryPort: primaryHostPort,
      primaryUrl: `http://${g.instance}.local:${primaryHostPort}`,
      containers: g.containers.map((c) => ({ id: c.id, name: c.name, service: c.service })),
      createdAt: "",
    });
  }
  return result;
};

export const uninstall = async (client: DockerClient, instance: string): Promise<void> => {
  const all = await dc.list(client, true);
  const toRemove = all.filter((w) => w.labels["castle.instance"] === instance);
  for (const c of toRemove) {
    try {
      await dc.remove(client, c.id, true);
    } catch {}
  }
};

export const isInstanceTaken = async (client: DockerClient, instance: string): Promise<boolean> => {
  const all = await dc.list(client, true);
  return all.some((w) => w.labels["castle.instance"] === instance);
};

export const knownAppIds = (): string[] => catalog.map((a) => a.id);
