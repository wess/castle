import type { Workload, WorkloadState } from "@castle/core";
import type { RawContainer } from "./types.ts";

const stateOf = (s: string): WorkloadState => {
  switch (s) {
    case "running":
      return "running";
    case "paused":
      return "paused";
    case "exited":
    case "dead":
      return "exited";
    case "created":
      return "stopped";
    case "restarting":
      return "running";
    default:
      return "unknown";
  }
};

export const toWorkload = (c: RawContainer): Workload => ({
  id: c.Id,
  kind: "docker",
  name: (c.Names[0] ?? "").replace(/^\//, ""),
  image: c.Image,
  state: stateOf(c.State),
  createdAt: c.Created * 1000,
  ports: c.Ports.filter((p) => p.PublicPort !== undefined).map((p) => ({
    host: p.PublicPort!,
    container: p.PrivatePort,
    protocol: p.Type,
  })),
  mounts: c.Mounts.map((m) => ({
    source: m.Source,
    target: m.Destination,
    readonly: !m.RW,
  })),
  network: c.HostConfig?.NetworkMode,
  labels: c.Labels ?? {},
});
