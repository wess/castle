import { del, get, halt, json, patch as patchR, pipe, post, put, stream } from "@atlas/server";
import { chat, createClient, models } from "@castle/ollama";
import { settings } from "../db/index.ts";
import * as chats from "../ollama/chats.ts";
import * as pulls from "../ollama/jobs.ts";
import { app } from "../state.ts";

type AuthAssign = { auth: { sub: number; email: string } };
const userId = (c: { assigns: Record<string, unknown> }): number => (c.assigns as AuthAssign).auth.sub;

const clientFromSettings = async () => {
  const [url, apiKey] = await Promise.all([
    settings.get(app().db, "ollama_url"),
    settings.get(app().db, "ollama_api_key"),
  ]);
  return createClient(url, { apiKey: apiKey || undefined });
};

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

export const ollamaRoutes = [
  get(
    "/api/ollama/settings",
    pipe(async (c) => {
      const [url, apiKey] = await Promise.all([
        settings.get(app().db, "ollama_url"),
        settings.get(app().db, "ollama_api_key"),
      ]);
      return json(c, 200, { url, apiKey });
    }),
  ),

  put(
    "/api/ollama/settings",
    pipe(async (c) => {
      const body = await readJson(c.request);
      if (typeof body.url !== "string" || !body.url) return halt(c, 422, { error: "url required" });
      await settings.set(app().db, "ollama_url", body.url);
      if (typeof body.apiKey === "string") {
        await settings.set(app().db, "ollama_api_key", body.apiKey);
      }
      return json(c, 200, { url: body.url, apiKey: await settings.get(app().db, "ollama_api_key") });
    }),
  ),

  get(
    "/api/ollama/status",
    pipe(async (c) => {
      const client = await clientFromSettings();
      const ok = await models.ping(client);
      return json(c, 200, { ok, url: client.base });
    }),
  ),

  get(
    "/api/ollama/models",
    pipe(async (c) => {
      try {
        const client = await clientFromSettings();
        const list = await models.list(client);
        return json(c, 200, { models: list });
      } catch (err) {
        return halt(c, 502, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/ollama/pull",
    pipe(async (c) => {
      const body = await readJson(c.request);
      if (!body.name) return halt(c, 422, { error: "name required" });
      const { started, job } = pulls.start(String(body.name));
      return json(c, started ? 202 : 200, { job });
    }),
  ),

  get(
    "/api/ollama/pulls",
    pipe(async (c) => json(c, 200, { pulls: pulls.list() })),
  ),

  get(
    "/api/ollama/pulls/:name",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      const job = pulls.get(name);
      if (!job) return halt(c, 404, { error: "no such pull" });
      return json(c, 200, { job });
    }),
  ),

  del(
    "/api/ollama/pulls/:name",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      const cancelled = pulls.cancel(name);
      return json(c, 200, { cancelled });
    }),
  ),

  del(
    "/api/ollama/models/:name",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      try {
        const client = await clientFromSettings();
        await models.remove(client, name);
        return json(c, 200, { ok: true });
      } catch (err) {
        return halt(c, 502, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  post(
    "/api/ollama/chat",
    pipe(async (c) => {
      const body = await readJson(c.request);
      if (!body.model || !Array.isArray(body.messages)) {
        return halt(c, 422, { error: "model and messages required" });
      }
      try {
        const client = await clientFromSettings();
        const body$ = await chat.chat(client, {
          model: body.model,
          messages: body.messages,
          options: body.options,
        });
        return stream(c, 200, body$);
      } catch (err) {
        return halt(c, 502, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  get(
    "/api/ollama/chats",
    pipe(async (c) => json(c, 200, { chats: await chats.list(app().db, userId(c)) })),
  ),

  get(
    "/api/ollama/chats/:id",
    pipe(async (c) => {
      const row = await chats.get(app().db, userId(c), c.params.id!);
      if (!row) return halt(c, 404, { error: "not found" });
      return json(c, 200, { chat: row });
    }),
  ),

  post(
    "/api/ollama/chats",
    pipe(async (c) => {
      const body = await readJson(c.request);
      if (!body.title || !body.model) return halt(c, 422, { error: "title and model required" });
      const row = await chats.create(app().db, userId(c), {
        title: String(body.title),
        model: String(body.model),
        messages: Array.isArray(body.messages) ? body.messages : [],
      });
      return json(c, 201, { chat: row });
    }),
  ),

  patchR(
    "/api/ollama/chats/:id",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const row = await chats.update(app().db, userId(c), c.params.id!, {
        title: typeof body.title === "string" ? body.title : undefined,
        model: typeof body.model === "string" ? body.model : undefined,
        messages: Array.isArray(body.messages) ? body.messages : undefined,
      });
      if (!row) return halt(c, 404, { error: "not found" });
      return json(c, 200, { chat: row });
    }),
  ),

  del(
    "/api/ollama/chats/:id",
    pipe(async (c) => {
      await chats.remove(app().db, userId(c), c.params.id!);
      return json(c, 200, { ok: true });
    }),
  ),
];
