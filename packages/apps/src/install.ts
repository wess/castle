import { type DockerClient, containers as dc, images as di } from "@castle/docker";
import { collectSecretKeys, containerName, expand, generateSecrets, type RenderContext, renderEnv } from "./render.ts";
import type { AppInstance, AppPort, AppService, AppTemplate } from "./types.ts";

const BASE_PORT_OFFSET = 20000;

const hostPortFor = (instance: string, port: AppPort): number => {
  if (port.hostOffset) return BASE_PORT_OFFSET + port.hostOffset;
  let hash = 0;
  const seed = `${instance}:${port.container}`;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return BASE_PORT_OFFSET + (hash % 20000);
};

const sortByDeps = (services: AppService[]): AppService[] => {
  const byKey = new Map(services.map((s) => [s.key, s]));
  const ordered: AppService[] = [];
  const seen = new Set<string>();

  const visit = (svc: AppService) => {
    if (seen.has(svc.key)) return;
    seen.add(svc.key);
    for (const dep of svc.dependsOn ?? []) {
      const d = byKey.get(dep);
      if (d) visit(d);
    }
    ordered.push(svc);
  };

  for (const s of services) visit(s);
  return ordered;
};

const labelsFor = (appId: string, instance: string, service: AppService): Record<string, string> => ({
  "castle.app": appId,
  "castle.instance": instance,
  "castle.service": service.key,
  "castle.role": service.role,
});

const volumeName = (instance: string, service: AppService, vol: { name: string }): string =>
  `castle_${instance}_${service.key}_${vol.name}`;

const primaryPortOf = (svc: AppService): AppPort | undefined => svc.ports?.find((p) => p.primary) ?? svc.ports?.[0];

export type InstallOptions = {
  inputs?: Record<string, string>;
  onProgress?: (msg: string) => void;
};

export const install = async (
  client: DockerClient,
  tpl: AppTemplate,
  instance: string,
  opts: InstallOptions = {},
): Promise<AppInstance> => {
  const progress = opts.onProgress ?? (() => {});
  const ctx: RenderContext = {
    instance,
    secrets: generateSecrets(collectSecretKeys(tpl)),
    inputs: opts.inputs ?? {},
  };

  const ordered = sortByDeps(tpl.services);
  const created: AppInstance["containers"] = [];
  let primaryHostPort = 0;

  for (const svc of ordered) {
    progress(`pulling ${svc.image}`);
    await di.pull(client, svc.image);

    const portSpec = (svc.ports ?? []).map((p) => {
      const host = hostPortFor(instance, p);
      if (p.primary && svc.role === "primary") primaryHostPort = host;
      return { host, container: p.container, protocol: p.protocol };
    });

    const mounts = (svc.volumes ?? []).map((v) => ({
      source: volumeName(instance, svc, v),
      target: v.target,
    }));

    const name = containerName(instance, svc);
    progress(`creating ${name}`);
    const id = await dc.create(client, {
      name,
      image: svc.image,
      env: renderEnv(svc.env, ctx),
      ports: portSpec,
      mounts,
      cmd: svc.cmd?.map((c) => expand(c, ctx)),
      labels: labelsFor(tpl.id, instance, svc),
      restart: "unless-stopped",
      gpu: svc.gpu,
    });
    progress(`starting ${name}`);
    await dc.start(client, id);
    created.push({ id, name, service: svc.key });
  }

  const primary = ordered.find((s) => s.role === "primary");
  const primaryContainer = primary && primaryPortOf(primary) ? primaryPortOf(primary)!.container : 0;

  return {
    appId: tpl.id,
    name: instance,
    hostname: `${instance}.local`,
    primaryPort: primaryHostPort || primaryContainer,
    primaryUrl: `http://${instance}.local:${primaryHostPort || primaryContainer}`,
    containers: created,
    createdAt: new Date().toISOString(),
    secrets: ctx.secrets,
  };
};
