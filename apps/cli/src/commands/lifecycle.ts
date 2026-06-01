import { command } from "@atlas/cli";
import { request } from "../client.ts";

const action = (verb: string, description: string, past: string) =>
  command(verb, {
    description,
    args: ["id"],
    run: async ({ args }) => {
      const id = args[0];
      if (!id) {
        console.error(`usage: castle ${verb} <id>`);
        process.exit(1);
      }
      await request("POST", `/containers/${id}/${verb}`);
      console.log(`${past}: ${id}`);
    },
  });

export const start = action("start", "Start a container", "started");
export const stop = action("stop", "Stop a container", "stopped");
export const restart = action("restart", "Restart a container", "restarted");

export const rm = command("rm", {
  description: "Remove a container",
  args: ["id"],
  flags: { force: { short: "f", type: "boolean", default: false } },
  run: async ({ args, flags }) => {
    const id = args[0];
    if (!id) {
      console.error("usage: castle rm <id> [-f]");
      process.exit(1);
    }
    await request("DELETE", `/containers/${id}?force=${flags.force ? 1 : 0}`);
    console.log(`removed: ${id}`);
  },
});
