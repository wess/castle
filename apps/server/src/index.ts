import { options, router } from "@atlas/server";
import { ensureAdmin } from "./auth/bootstrap.ts";
import { config } from "./config.ts";
import { cors } from "./cors.ts";
import { startEvents } from "./events/index.ts";
import { buildRoutes } from "./routes/index.ts";
import { spa } from "./spa.ts";
import { init } from "./state.ts";
import { tryUpgrade, websocket } from "./ws/router.ts";

const cfg = config();
const state = await init();

await ensureAdmin(state.db, cfg.adminEmail, cfg.adminPassword);

const preflight = options("/*", async (c) => {
  const after = cors(cfg.webOrigin)(c);
  return { ...after, status: 204 };
});

const apiHandler = router(preflight, ...(await buildRoutes(cfg.secret, cfg.databaseUrl, state.db)));
const spaHandler = cfg.webRoot ? spa(cfg.webRoot) : null;

const fetchHandler = async (req: Request, server: any): Promise<Response | undefined> => {
  const url = new URL(req.url);

  if (req.headers.get("upgrade") === "websocket") {
    const upgraded = await tryUpgrade(req, server, cfg.secret);
    if (upgraded) return undefined;
    return new Response("Unauthorized", { status: 401 });
  }

  // GET /oauth/authorize is the user-facing consent page — render it via
  // the SPA. Everything else under /oauth/* (authorize/info, /token,
  // /authorize/approve, /revoke, /jwks, ...) is API-only.
  const isAuthorizePage = req.method === "GET" && url.pathname === "/oauth/authorize";

  // OIDC well-known + /oauth/* + Castle's /api/* all served by the same
  // router. Path discrimination here just lets the SPA handler take
  // everything else without the framework having to walk every route.
  if (
    !isAuthorizePage &&
    (url.pathname.startsWith("/api") ||
      url.pathname === "/api" ||
      url.pathname.startsWith("/oauth/") ||
      url.pathname.startsWith("/.well-known/"))
  ) {
    const res = await apiHandler(req);
    const headers = new Headers(res.headers);
    headers.set("access-control-allow-origin", cfg.webOrigin);
    headers.set("access-control-allow-credentials", "true");
    return new Response(res.body, { status: res.status, headers });
  }
  if (spaHandler) return spaHandler(req);
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain;charset=utf-8" },
  });
};

const server = Bun.serve({
  port: cfg.port,
  hostname: cfg.host,
  fetch: fetchHandler,
  websocket,
});

startEvents(server);

console.log(`castled listening on http://${cfg.host}:${cfg.port}`);
if (spaHandler) console.log(`serving web from ${cfg.webRoot}`);
