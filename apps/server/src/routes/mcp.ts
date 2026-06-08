import { get, halt, json, pipe, post, put } from "@atlas/server";
import { config } from "../config.ts";
import { settings } from "../db/index.ts";
import { handle, toolSummaries } from "../mcp/handler.ts";
import { allTools } from "../mcp/tools.ts";
import { app } from "../state.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "castle-mcp";
const SERVER_VERSION = "0.0.1";

// Write tools (castle.users.provision) are advertised only when the operator
// has configured the CASTLE_ADMIN_TOKEN M2M secret. Even then each call must
// present that token, so discovery and execution are gated independently.
const writeEnabled = (): boolean => config().adminToken.length > 0;

const readJson = async (req: Request): Promise<any> => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

const generateToken = (): string => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
};

const bearerToken = (req: Request): string | null => {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
};

// Shared JSON-RPC entry point used by both /api/mcp and /mcp. Enforces the
// MCP enable flag + bearer token, then dispatches against the tool set —
// write tools are only in the set when the operator opted in via
// CASTLE_ADMIN_TOKEN, and the provision handler still re-checks that token.
const handleRpc = pipe(async (c: any) => {
  const enabled = await settings.get(app().db, "mcp_enabled");
  if (!enabled) return halt(c, 503, { error: "mcp disabled" });

  const expected = await settings.get(app().db, "mcp_token");
  if (!expected) return halt(c, 503, { error: "mcp token not set" });

  const provided = bearerToken(c.request);
  if (provided !== expected) return halt(c, 401, { error: "invalid token" });

  const body = await readJson(c.request);
  if (!body || typeof body.method !== "string") {
    return halt(c, 400, { error: "expected JSON-RPC request" });
  }
  const res = await handle(body, allTools(writeEnabled()));
  return json(c, 200, res);
});

// GET /mcp is unauthenticated discovery — AI clients (and the admin UI) hit
// it to confirm MCP is on and learn the endpoint, mirroring tangle's wrap.
const discovery = pipe(async (c: any) => {
  const enabled = await settings.get(app().db, "mcp_enabled");
  return json(c, 200, {
    enabled,
    endpoint: "/mcp",
    protocol_version: PROTOCOL_VERSION,
    server: { name: SERVER_NAME, version: SERVER_VERSION },
    write_enabled: writeEnabled(),
    auth: "Bearer (mcp_token) on POST /mcp",
  });
});

export const mcpOpenRoutes = [
  post("/api/mcp", handleRpc),
  // M6.3: bearer-authenticated control-plane MCP at /mcp (alongside the
  // existing /api/mcp), matching the path remote AI clients expect.
  get("/mcp", discovery),
  post("/mcp", handleRpc),
];

export const mcpAdminRoutes = [
  get(
    "/api/mcp/info",
    pipe(async (c) => {
      const enabled = await settings.get(app().db, "mcp_enabled");
      const token = await settings.get(app().db, "mcp_token");
      const writes = writeEnabled();
      return json(c, 200, {
        enabled,
        token,
        tools: toolSummaries(allTools(writes)),
        endpoint: "/mcp",
        legacy_endpoint: "/api/mcp",
        write_enabled: writes,
      });
    }),
  ),

  put(
    "/api/mcp/enabled",
    pipe(async (c) => {
      const body = await readJson(c.request);
      const enabled = Boolean(body?.enabled);
      await settings.set(app().db, "mcp_enabled", enabled);
      if (enabled) {
        const existing = await settings.get(app().db, "mcp_token");
        if (!existing) await settings.set(app().db, "mcp_token", generateToken());
      }
      const token = await settings.get(app().db, "mcp_token");
      return json(c, 200, { enabled, token });
    }),
  ),

  post(
    "/api/mcp/regenerate",
    pipe(async (c) => {
      const token = generateToken();
      await settings.set(app().db, "mcp_token", token);
      return json(c, 200, { token });
    }),
  ),
];
