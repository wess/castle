import type { Workload } from "@castle/core";
import type { DockerClient } from "../client.ts";
import { toWorkload } from "../toworkload.ts";
import type { RawContainer } from "../types.ts";

export const list = async (client: DockerClient, all = true): Promise<Workload[]> => {
  const raw = await client.call<RawContainer[]>("GET", `/containers/json?all=${all ? 1 : 0}`);
  return raw.map(toWorkload);
};
