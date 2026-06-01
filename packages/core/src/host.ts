export type HostStats = {
  hostname: string;
  kernel: string;
  uptime: number;
  cpu: {
    cores: number;
    model: string;
    loadAvg: [number, number, number];
    usage: number;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
  };
};
