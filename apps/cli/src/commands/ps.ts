import { command } from "@atlas/cli";
import type { Workload } from "@castle/core";
import { request } from "../client.ts";
import { ago, shortId } from "../format.ts";
import { table } from "../table.ts";

export const ps = command("ps", {
  description: "List containers",
  run: async () => {
    const items = await request<Workload[]>("GET", "/containers");
    const rows = items.map((c) => ({
      id: shortId(c.id),
      name: c.name,
      image: c.image,
      state: c.state,
      ports: c.ports.map((p) => `${p.host}→${p.container}`).join(",") || "—",
      created: ago(c.createdAt),
    }));
    console.log(table(rows));
  },
});
