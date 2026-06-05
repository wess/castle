import { del, get, halt, json, pipe, post } from "@atlas/server";
import { catalog, findApp, install, isInstanceTaken, listInstances, uninstall } from "@castle/apps";
import { config } from "../config.ts";
import { store as connectionsStore } from "../connections/index.ts";
import { store as domains, reload as reloadDomains } from "../domains/index.ts";
import * as idpClients from "../idp/clients.ts";
import { app } from "../state.ts";
import { provisionAllUsersToConnection } from "../users/provision.ts";

const USER_AWARE_APPS = new Set(["tangle", "stohr", "tandem"]);

const NAME_RE = /^[a-z][a-z0-9-]{0,30}$/;

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

const safeReloadDomains = async (): Promise<{ reloaded: boolean; error?: string }> => {
  try {
    await reloadDomains();
    return { reloaded: true };
  } catch (err) {
    return { reloaded: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const appsRoutes = [
  get(
    "/api/apps",
    pipe(async (c) => json(c, 200, { apps: catalog })),
  ),

  get(
    "/api/apps/installed",
    pipe(async (c) => json(c, 200, { instances: await listInstances(app().docker) })),
  ),

  post(
    "/api/apps/install",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const appId = body.appId as string | undefined;
      const name = (body.name as string | undefined)?.toLowerCase();
      const inputs = (body.inputs as Record<string, string> | undefined) ?? {};

      if (!appId || !name) return halt(c, 422, { error: "appId and name required" });
      if (!NAME_RE.test(name)) {
        return halt(c, 422, { error: "name must be lowercase, start with a letter, and use a-z 0-9 -" });
      }
      const tpl = findApp(appId);
      if (!tpl) return halt(c, 404, { error: `unknown app: ${appId}` });
      if (await isInstanceTaken(app().docker, name)) {
        return halt(c, 409, { error: `name '${name}' already in use` });
      }

      try {
        // For user-aware apps, mint an OIDC client BEFORE the container
        // starts so the issuer URL + client_id + client_secret can be
        // injected as env vars. The app then mounts @atlas/sso at boot.
        let oidcInputs: Record<string, string> = {};
        if (USER_AWARE_APPS.has(tpl.id)) {
          const cfg = config();
          const issuer = cfg.publicUrl || `http://${cfg.host}`;
          const hostname = `${name}.local`;
          const created = await idpClients.create(app().db, {
            name: `${tpl.name} (${name})`,
            appId: tpl.id,
            instance: name,
            redirectUris: [`http://${hostname}/auth/sso/callback`],
            backchannelLogoutUri: `http://${hostname}/auth/sso/backchannel-logout`,
            postLogoutRedirectUris: [`http://${hostname}/`],
          });
          oidcInputs = {
            SSO_ISSUER: issuer,
            SSO_CLIENT_ID: created.client.client_id,
            SSO_CLIENT_SECRET: created.clientSecret,
          };
        }

        const instance = await install(app().docker, tpl, name, {
          inputs: { ...inputs, ...oidcInputs },
        });
        try {
          await domains.add(name);
        } catch {}
        const reload = await safeReloadDomains();
        // Register the M2M app_connection too (still used by the
        // /castle/users provisioner for pre-creating accounts).
        if (USER_AWARE_APPS.has(tpl.id)) {
          const token = instance.secrets?.CASTLE_ADMIN_TOKEN;
          if (token) {
            const conn = await connectionsStore.upsert(app().db, {
              appId: tpl.id as "tangle" | "stohr",
              instance: name,
              hostname: `${name}.local`,
              token,
              managed: true,
            });
            (async () => {
              await new Promise((r) => setTimeout(r, 5000));
              try {
                await provisionAllUsersToConnection(app().db, conn);
              } catch {}
            })();
          }
        }
        return json(c, 201, { instance, ...reload });
      } catch (err) {
        return halt(c, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),

  del(
    "/api/apps/:name",
    pipe(async (c) => {
      const name = decodeURIComponent(c.params.name!);
      try {
        await uninstall(app().docker, name);
        try {
          await domains.remove(name);
        } catch {}
        try {
          await connectionsStore.removeByInstance(app().db, name);
        } catch {}
        try {
          await idpClients.removeByInstance(app().db, name);
        } catch {}
        const reload = await safeReloadDomains();
        return json(c, 200, { ok: true, ...reload });
      } catch (err) {
        return halt(c, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    }),
  ),
];
