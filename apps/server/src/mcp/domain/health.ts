// Control-plane health probe. Surfaces whether the core subsystems Castle
// depends on (Postgres, the Docker engine) are reachable, plus a host summary.
// In-process so it reflects the daemon's actual view, not an external poll.

import { ping } from "@castle/docker";
import { collect as hostStats } from "../../host/stats.ts";
import { app } from "../../state.ts";
import type { Tool } from "../tools.ts";

const dbOk = async (): Promise<boolean> => {
  try {
    await app().db`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

const dockerOk = async (): Promise<boolean> => {
  try {
    return await ping(app().docker);
  } catch {
    return false;
  }
};

export const healthTools: Tool[] = [
  {
    name: "castle.health",
    description:
      "Report Castle control-plane health: database reachability, Docker engine reachability, " +
      "and a host CPU/memory/disk/uptime summary.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const [database, docker, host] = await Promise.all([dbOk(), dockerOk(), hostStats()]);
      return {
        ok: database && docker,
        database: { ok: database },
        docker: { ok: docker },
        host,
      };
    },
  },
];
