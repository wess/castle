import { command } from "@atlas/cli";
import { stream } from "../client.ts";

export const logs = command("logs", {
  description: "Stream container logs",
  args: ["id"],
  flags: { tail: { short: "n", type: "string", default: "200" } },
  run: async ({ args, flags }) => {
    const id = args[0];
    if (!id) {
      console.error("usage: castle logs <id> [-n N]");
      process.exit(1);
    }
    const body = await stream(`/containers/${id}/logs?tail=${flags.tail}`);
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) process.stdout.write(value);
    }
  },
});
