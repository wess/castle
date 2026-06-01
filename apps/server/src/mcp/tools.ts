import { catalog, install as installApp, listInstances } from "@castle/apps";
import { containers as dc, images as di } from "@castle/docker";
import * as lxc from "@castle/lxc";
import { createClient as createOllama, models as ollamaModels } from "@castle/ollama";
import { settings } from "../db/index.ts";
import { collect as hostStats } from "../host/stats.ts";
import { app } from "../state.ts";

export type ToolInput = {
  type: "object";
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: ToolInput;
  handler: (params: Record<string, any>) => Promise<unknown>;
};

const tool = (t: Tool): Tool => t;

const ollamaClient = async () => {
  const [url, apiKey] = await Promise.all([
    settings.get(app().db, "ollama_url"),
    settings.get(app().db, "ollama_api_key"),
  ]);
  return createOllama(url, { apiKey: apiKey || undefined });
};

export const tools: Tool[] = [
  tool({
    name: "castle.host.stats",
    description: "Get current host CPU, memory, disk, and uptime stats.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => hostStats(),
  }),

  tool({
    name: "castle.containers.list",
    description: "List all Docker containers managed on this host.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => dc.list(app().docker, true),
  }),

  tool({
    name: "castle.containers.start",
    description: "Start a Docker container by id or name.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Container id or name" } },
      required: ["id"],
    },
    handler: async ({ id }) => {
      await dc.start(app().docker, String(id));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.containers.stop",
    description: "Stop a Docker container by id or name.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Container id or name" } },
      required: ["id"],
    },
    handler: async ({ id }) => {
      await dc.stop(app().docker, String(id));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.containers.restart",
    description: "Restart a Docker container by id or name.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Container id or name" } },
      required: ["id"],
    },
    handler: async ({ id }) => {
      await dc.restart(app().docker, String(id));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.containers.logs",
    description: "Tail the last N log lines of a container (default 200).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Container id or name" },
        tail: { type: "number", description: "How many lines (default 200)" },
      },
      required: ["id"],
    },
    handler: async ({ id, tail }) => {
      const stream = await dc.logs(app().docker, String(id), {
        tail: typeof tail === "number" ? tail : 200,
      });
      const reader = dc.demux(stream).getReader();
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(decoder.decode(value));
      }
      return { logs: chunks.join("") };
    },
  }),

  tool({
    name: "castle.containers.exec",
    description: "Run a single command in a container and return stdout/stderr.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Container id or name" },
        cmd: { type: "string", description: "Command and args as a single string (parsed via /bin/sh -c)" },
      },
      required: ["id", "cmd"],
    },
    handler: async ({ id, cmd }) => {
      const handle = await dc.openExec(app().docker, String(id), {
        cmd: ["/bin/sh", "-c", String(cmd)],
        tty: false,
      });
      const decoder = new TextDecoder();
      let output = "";
      handle.socket.onData((chunk) => {
        output += decoder.decode(chunk);
      });
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 30_000);
        handle.socket.onClose(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      handle.socket.close();
      return { output };
    },
  }),

  tool({
    name: "castle.lxc.list",
    description: "List LXC system containers on this host.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => lxc.list(),
  }),

  tool({
    name: "castle.lxc.start",
    description: "Start an LXC container by name.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    handler: async ({ name }) => {
      await lxc.start(String(name));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.lxc.stop",
    description: "Stop an LXC container by name.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    handler: async ({ name }) => {
      await lxc.stop(String(name));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.images.list",
    description: "List Docker images on this host.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => di.list(app().docker),
  }),

  tool({
    name: "castle.images.pull",
    description: "Pull a Docker image by reference (e.g. nginx:latest).",
    inputSchema: {
      type: "object",
      properties: { ref: { type: "string" } },
      required: ["ref"],
    },
    handler: async ({ ref }) => {
      await di.pull(app().docker, String(ref));
      return { ok: true };
    },
  }),

  tool({
    name: "castle.apps.catalog",
    description: "List apps available for one-click install.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => catalog,
  }),

  tool({
    name: "castle.apps.installed",
    description: "List currently installed app instances.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => listInstances(app().docker),
  }),

  tool({
    name: "castle.apps.install",
    description: "Install an app from the catalog under a given instance name.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Catalog id (e.g. ollama, jellyfin)" },
        name: { type: "string", description: "Instance name; becomes <name>.local" },
      },
      required: ["appId", "name"],
    },
    handler: async ({ appId, name }) => {
      const tpl = catalog.find((a) => a.id === appId);
      if (!tpl) throw new Error(`unknown app: ${appId}`);
      return installApp(app().docker, tpl, String(name));
    },
  }),

  tool({
    name: "castle.ollama.models",
    description: "List Ollama models installed on the configured Ollama endpoint.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => ollamaModels.list(await ollamaClient()),
  }),
];
