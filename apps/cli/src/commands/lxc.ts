import { command } from "@atlas/cli";
import type { Workload } from "@castle/core";
import { request } from "../client.ts";
import { table } from "../table.ts";

export const lxc = command("lxc", {
  description: "Manage LXC containers",
  subcommands: [
    command("ls", {
      description: "List LXC containers",
      run: async () => {
        const items = await request<Workload[]>("GET", "/lxc");
        console.log(table(items.map((c) => ({ name: c.name, state: c.state }))));
      },
    }),
    command("start", {
      description: "Start an LXC",
      args: ["name"],
      run: async ({ args }) => {
        const n = args[0];
        if (!n) {
          console.error("usage: castle lxc start <name>");
          process.exit(1);
        }
        await request("POST", `/lxc/${n}/start`);
        console.log(`started: ${n}`);
      },
    }),
    command("stop", {
      description: "Stop an LXC",
      args: ["name"],
      run: async ({ args }) => {
        const n = args[0];
        if (!n) {
          console.error("usage: castle lxc stop <name>");
          process.exit(1);
        }
        await request("POST", `/lxc/${n}/stop`);
        console.log(`stopped: ${n}`);
      },
    }),
    command("destroy", {
      description: "Destroy an LXC",
      args: ["name"],
      flags: { force: { short: "f", type: "boolean", default: false } },
      run: async ({ args, flags }) => {
        const n = args[0];
        if (!n) {
          console.error("usage: castle lxc destroy <name> [-f]");
          process.exit(1);
        }
        await request("DELETE", `/lxc/${n}?force=${flags.force ? 1 : 0}`);
        console.log(`destroyed: ${n}`);
      },
    }),
  ],
  run: () => {
    console.log("usage: castle lxc <ls|start|stop|destroy> [args]");
  },
});
