import type { DockerClient } from "../client.ts";
import type { CreateContainerSpec } from "../types.ts";

type DeviceRequest = {
  Driver: string;
  Count: number;
  Capabilities: string[][];
};

type EngineCreatePayload = {
  Image: string;
  Cmd?: string[];
  Env?: string[];
  Labels?: Record<string, string>;
  ExposedPorts?: Record<string, Record<string, never>>;
  HostConfig: {
    PortBindings?: Record<string, Array<{ HostPort: string }>>;
    Binds?: string[];
    NetworkMode?: string;
    RestartPolicy?: { Name: string };
    DeviceRequests?: DeviceRequest[];
  };
};

const buildPayload = (spec: CreateContainerSpec): EngineCreatePayload => {
  const exposed: Record<string, Record<string, never>> = {};
  const bindings: Record<string, Array<{ HostPort: string }>> = {};
  for (const p of spec.ports ?? []) {
    const key = `${p.container}/${p.protocol ?? "tcp"}`;
    exposed[key] = {};
    bindings[key] = [{ HostPort: String(p.host) }];
  }

  const binds = (spec.mounts ?? []).map((m) => `${m.source}:${m.target}${m.readonly ? ":ro" : ""}`);

  const gpuRequests: DeviceRequest[] | undefined = spec.gpu
    ? [{ Driver: "nvidia", Count: -1, Capabilities: [["gpu"]] }]
    : undefined;

  return {
    Image: spec.image,
    Cmd: spec.cmd,
    Env: spec.env,
    Labels: spec.labels,
    ExposedPorts: Object.keys(exposed).length ? exposed : undefined,
    HostConfig: {
      PortBindings: Object.keys(bindings).length ? bindings : undefined,
      Binds: binds.length ? binds : undefined,
      NetworkMode: spec.network,
      RestartPolicy: spec.restart ? { Name: spec.restart } : undefined,
      DeviceRequests: gpuRequests,
    },
  };
};

export const create = async (client: DockerClient, spec: CreateContainerSpec): Promise<string> => {
  const payload = buildPayload(spec);
  const res = await client.call<{ Id: string }>(
    "POST",
    `/containers/create?name=${encodeURIComponent(spec.name)}`,
    payload,
  );
  return res.Id;
};
