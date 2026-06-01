import type { Network } from "@castle/core";
import type { DockerClient } from "../client.ts";
import type { RawNetwork } from "../types.ts";

const toNetwork = (n: RawNetwork): Network => {
  const cfg = n.IPAM?.Config?.[0];
  return {
    id: n.Id,
    name: n.Name,
    kind: (n.Driver === "bridge" || n.Driver === "host" || n.Driver === "macvlan" || n.Driver === "overlay"
      ? n.Driver
      : "none") as Network["kind"],
    driver: n.Driver,
    subnet: cfg?.Subnet,
    gateway: cfg?.Gateway,
    attached: n.Containers ? Object.keys(n.Containers).length : 0,
  };
};

export const list = async (client: DockerClient): Promise<Network[]> => {
  const raw = await client.call<RawNetwork[]>("GET", "/networks");
  return raw.map(toNetwork);
};

export const create = (client: DockerClient, name: string, driver = "bridge"): Promise<{ Id: string }> =>
  client.call<{ Id: string }>("POST", "/networks/create", { Name: name, Driver: driver });

export const remove = (client: DockerClient, id: string): Promise<void> =>
  client.call("DELETE", `/networks/${encodeURIComponent(id)}`);
