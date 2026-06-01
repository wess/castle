import type { Workload, WorkloadState } from "@castle/core";
import { exec } from "./exec.ts";

const stateOf = (s: string): WorkloadState => {
  switch (s.toUpperCase()) {
    case "RUNNING":
      return "running";
    case "STOPPED":
      return "stopped";
    case "FROZEN":
      return "paused";
    case "ABORTING":
    case "STOPPING":
      return "stopped";
    case "STARTING":
      return "running";
    default:
      return "unknown";
  }
};

export const list = async (): Promise<Workload[]> => {
  const r = await exec(["lxc-ls", "--fancy", "--fancy-format", "name,state,ipv4,autostart"]);
  if (r.code !== 0) return [];
  const lines = r.stdout.split("\n").slice(2).filter(Boolean);
  return lines.map((line) => {
    const parts = line.trim().split(/\s+/);
    const name = parts[0] ?? "";
    const state = parts[1] ?? "";
    return {
      id: `lxc:${name}`,
      kind: "lxc",
      name,
      image: "lxc",
      state: stateOf(state),
      createdAt: 0,
      ports: [],
      mounts: [],
      labels: {},
    } satisfies Workload;
  });
};
