import type { Network } from "@castle/core";
import { exec, must } from "./exec.ts";

type IpLink = {
  ifname: string;
  ifindex: number;
  operstate: string;
  flags: string[];
  master?: string;
};

export const parseLinks = (stdout: string): Network[] => {
  let parsed: IpLink[];
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((link) => ({
    id: `bridge:${link.ifname}`,
    name: link.ifname,
    kind: "bridge" as const,
    driver: "linux-bridge",
    attached: 0,
  }));
};

export const list = async (): Promise<Network[]> => {
  const r = await exec(["ip", "-j", "link", "show", "type", "bridge"]);
  if (r.code !== 0) return [];
  return parseLinks(r.stdout);
};

export const create = async (name: string): Promise<void> => {
  await must(["ip", "link", "add", "name", name, "type", "bridge"]);
  await must(["ip", "link", "set", name, "up"]);
};

export const remove = async (name: string): Promise<void> => {
  await must(["ip", "link", "delete", name, "type", "bridge"]);
};

export const setAddress = (name: string, cidr: string): Promise<string> =>
  must(["ip", "addr", "add", cidr, "dev", name]);
