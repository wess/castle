import { command } from "@atlas/cli";
import type { Network } from "@castle/core";
import { request } from "../client.ts";
import { table } from "../table.ts";

export const nets = command("nets", {
  description: "List networks",
  run: async () => {
    const data = await request<{ docker: Network[]; host: Network[] }>("GET", "/networks");
    if (data.docker.length) {
      console.log("docker:");
      console.log(
        table(
          data.docker.map((n) => ({
            name: n.name,
            driver: n.driver,
            subnet: n.subnet ?? "—",
            attached: String(n.attached),
          })),
        ),
      );
    }
    if (data.host.length) {
      console.log("\nhost bridges:");
      console.log(table(data.host.map((n) => ({ name: n.name, driver: n.driver }))));
    }
  },
});
