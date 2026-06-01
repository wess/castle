import type { HostStats } from "@castle/core";

const readFile = async (path: string): Promise<string> => {
  try {
    return await Bun.file(path).text();
  } catch {
    return "";
  }
};

const parseMemInfo = (text: string): { total: number; free: number; available: number } => {
  const lines = text.split("\n");
  const get = (key: string): number => {
    const line = lines.find((l) => l.startsWith(`${key}:`));
    if (!line) return 0;
    const parts = line.split(/\s+/);
    return Number(parts[1] ?? 0) * 1024;
  };
  return {
    total: get("MemTotal"),
    free: get("MemFree"),
    available: get("MemAvailable"),
  };
};

const parseCpuInfo = (text: string): { cores: number; model: string } => {
  const cores = (text.match(/^processor\s*:/gm) ?? []).length;
  const modelLine = text.split("\n").find((l) => l.startsWith("model name"));
  const model = modelLine ? (modelLine.split(":")[1] ?? "").trim() : "";
  return { cores: cores || 1, model };
};

const parseLoadAvg = (text: string): [number, number, number] => {
  const parts = text.trim().split(/\s+/);
  return [Number(parts[0] ?? 0), Number(parts[1] ?? 0), Number(parts[2] ?? 0)];
};

const parseUptime = (text: string): number => Number(text.split(/\s+/)[0] ?? 0);

const readDiskUsage = async (): Promise<{ total: number; used: number }> => {
  const proc = Bun.spawn(["df", "-B1", "--output=size,used", "/"], { stdout: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const line = out.split("\n")[1]?.trim() ?? "";
  const [total, used] = line.split(/\s+/).map(Number);
  return { total: total ?? 0, used: used ?? 0 };
};

export const collect = async (): Promise<HostStats> => {
  const [memText, cpuText, loadText, uptimeText, hostnameText, kernelText, disk] = await Promise.all([
    readFile("/proc/meminfo"),
    readFile("/proc/cpuinfo"),
    readFile("/proc/loadavg"),
    readFile("/proc/uptime"),
    readFile("/proc/sys/kernel/hostname"),
    readFile("/proc/sys/kernel/osrelease"),
    readDiskUsage(),
  ]);

  const mem = parseMemInfo(memText);
  const cpu = parseCpuInfo(cpuText);
  const load = parseLoadAvg(loadText);
  const uptime = parseUptime(uptimeText);

  return {
    hostname: hostnameText.trim() || "unknown",
    kernel: kernelText.trim() || "unknown",
    uptime,
    cpu: {
      cores: cpu.cores,
      model: cpu.model,
      loadAvg: load,
      usage: Math.min(load[0] / cpu.cores, 1),
    },
    memory: {
      totalBytes: mem.total,
      usedBytes: mem.total - mem.available,
      freeBytes: mem.free,
    },
    disk: {
      totalBytes: disk.total,
      usedBytes: disk.used,
    },
  };
};
