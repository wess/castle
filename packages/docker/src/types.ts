export type RawContainer = {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: "tcp" | "udp" }>;
  Labels: Record<string, string>;
  Mounts: Array<{ Source: string; Destination: string; RW: boolean; Type: string }>;
  HostConfig?: { NetworkMode: string };
  NetworkSettings?: { Networks: Record<string, { IPAddress: string }> };
};

export type RawContainerInspect = RawContainer & {
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    StartedAt: string;
    FinishedAt: string;
    ExitCode: number;
    Error: string;
  } & string;
  Config: {
    Image: string;
    Cmd: string[] | null;
    Env: string[] | null;
    Labels: Record<string, string>;
  };
};

export type RawImage = {
  Id: string;
  RepoTags: string[] | null;
  RepoDigests: string[] | null;
  Created: number;
  Size: number;
  Labels: Record<string, string> | null;
};

export type RawNetwork = {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  IPAM?: { Config?: Array<{ Subnet?: string; Gateway?: string }> };
  Containers?: Record<string, unknown>;
};

export type RawVolume = {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  Labels: Record<string, string> | null;
  UsageData?: { Size: number; RefCount: number };
};

export type CreateContainerSpec = {
  name: string;
  image: string;
  cmd?: string[];
  env?: string[];
  ports?: Array<{ host: number; container: number; protocol?: "tcp" | "udp" }>;
  mounts?: Array<{ source: string; target: string; readonly?: boolean }>;
  network?: string;
  restart?: "no" | "always" | "unless-stopped" | "on-failure";
  labels?: Record<string, string>;
  gpu?: boolean;
};
