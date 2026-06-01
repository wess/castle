import { type PipeFn, pipeline, type Route } from "@atlas/server";
import { requireAuth } from "../auth/middleware.ts";
import { authRoutes } from "../auth/routes.ts";
import { dbmRoutes } from "../dbm/routes/index.ts";
import { buildIdp } from "../idp/index.ts";
import { appsRoutes } from "./apps.ts";
import { connectionsRoutes } from "./connections.ts";
import { containerRoutes } from "./containers.ts";
import { domainRoutes } from "./domains.ts";
import { hostRoutes } from "./host.ts";
import { imageRoutes } from "./images.ts";
import { lxcRoutes } from "./lxc.ts";
import { mcpAdminRoutes, mcpOpenRoutes } from "./mcp.ts";
import { networkRoutes } from "./networks.ts";
import { ollamaRoutes } from "./ollama.ts";
import { routesRoutes } from "./routes.ts";
import { settingsRoutes } from "./settings.ts";
import { storageRoutes } from "./storage.ts";
import { usersRoutes } from "./users.ts";

const gated = (route: Route, guard: PipeFn): Route => ({
  ...route,
  handler: pipeline(guard)(route.handler),
});

export const buildRoutes = async (
  secret: string,
  databaseUrl: string,
  db: import("../db/index.ts").Db,
): Promise<Route[]> => {
  const guard = requireAuth(secret);
  const open = authRoutes(secret);
  const protectedRoutes = [
    ...hostRoutes,
    ...containerRoutes,
    ...imageRoutes,
    ...lxcRoutes,
    ...networkRoutes,
    ...storageRoutes,
    ...settingsRoutes,
    ...domainRoutes,
    ...appsRoutes,
    ...usersRoutes,
    ...connectionsRoutes,
    ...routesRoutes,
    ...ollamaRoutes,
    ...mcpAdminRoutes,
    ...dbmRoutes,
  ].map((r) => gated(r, guard));

  // OIDC routes mount unprotected — discovery, jwks, userinfo, token, and
  // /authorize have their own auth model. requireUser inside @atlas/oauth
  // gates the consent dance against Castle's own JWT.
  const idp = await buildIdp(db, databaseUrl, secret);

  return [...open, ...idp.routes, ...protectedRoutes, ...mcpOpenRoutes];
};
