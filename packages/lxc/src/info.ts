import { exec } from "./exec.ts";

export type LxcInfo = {
  name: string;
  state: string;
  pid?: number;
  ipv4?: string;
  ipv6?: string;
  cpuUse?: string;
  memUse?: string;
  link?: string;
};

const parse = (text: string, name: string): LxcInfo => {
  const out: LxcInfo = { name, state: "UNKNOWN" };
  for (const line of text.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const value = rest.join(":").trim();
    switch (key.trim()) {
      case "State":
        out.state = value;
        break;
      case "PID":
        out.pid = Number(value);
        break;
      case "IP":
        if (!out.ipv4) out.ipv4 = value;
        else out.ipv6 = value;
        break;
      case "CPU use":
        out.cpuUse = value;
        break;
      case "Memory use":
        out.memUse = value;
        break;
      case "Link":
        out.link = value;
        break;
    }
  }
  return out;
};

export const inspect = async (name: string): Promise<LxcInfo | null> => {
  const r = await exec(["lxc-info", "-n", name]);
  if (r.code !== 0) return null;
  return parse(r.stdout, name);
};
