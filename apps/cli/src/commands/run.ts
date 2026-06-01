import { command } from "@atlas/cli";
import { request } from "../client.ts";

const parsePort = (spec: string) => {
  const [host, container] = spec.split(":").map(Number);
  if (!host || !container) return null;
  return { host, container };
};

export const run = command("run", {
  description: "Create and start a container",
  args: ["image"],
  flags: {
    name: { short: "n", type: "string" },
    port: { short: "p", type: "string" },
    env: { short: "e", type: "string" },
    restart: { short: "r", type: "string", default: "unless-stopped" },
  },
  run: async ({ args, flags }) => {
    const image = args[0];
    if (!image) {
      console.error("usage: castle run <image> [-n name] [-p host:container] [-e KEY=val]");
      process.exit(1);
    }
    const name = (flags.name as string) ?? `castle${Date.now().toString(36)}`;
    const portSpec = flags.port as string | undefined;
    const envSpec = flags.env as string | undefined;
    const port = portSpec ? parsePort(portSpec) : null;

    const { id } = await request<{ id: string }>("POST", "/containers", {
      name,
      image,
      ports: port ? [port] : [],
      env: envSpec ? [envSpec] : [],
      restart: flags.restart as string,
    });
    await request("POST", `/containers/${id}/start`);
    console.log(`${name} (${id.slice(0, 12)}) started`);
  },
});
