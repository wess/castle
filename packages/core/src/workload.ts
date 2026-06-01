export type WorkloadKind = "docker" | "lxc";

export type WorkloadState = "creating" | "running" | "paused" | "stopped" | "exited" | "error" | "unknown";

export type PortMap = {
  host: number;
  container: number;
  protocol: "tcp" | "udp";
};

export type MountMap = {
  source: string;
  target: string;
  readonly: boolean;
};

export type Workload = {
  id: string;
  kind: WorkloadKind;
  name: string;
  image: string;
  state: WorkloadState;
  createdAt: number;
  startedAt?: number;
  ports: PortMap[];
  mounts: MountMap[];
  network?: string;
  labels: Record<string, string>;
};
