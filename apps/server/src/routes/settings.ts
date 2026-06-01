import { get, json, patch, pipe } from "@atlas/server";
import { settings as store } from "../db/index.ts";
import { app } from "../state.ts";

type SettingsPatch = Partial<{ auth_required: boolean }>;

export const settingsRoutes = [
  get(
    "/api/settings",
    pipe(async (c) => json(c, 200, await store.getAll(app().db))),
  ),

  patch(
    "/api/settings",
    pipe(async (c) => {
      const body = (await c.request.json().catch(() => ({}))) as SettingsPatch;
      if (typeof body.auth_required === "boolean") {
        await store.set(app().db, "auth_required", body.auth_required);
      }
      return json(c, 200, await store.getAll(app().db));
    }),
  ),
];
