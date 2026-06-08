// Guarded WRITE tool. Mirrors Castle's POST /api/users provisioning path:
// create (or look up) a user, then fan the credentials out to every
// registered app connection. This is the only mutating MCP tool, so it is
// gated twice — it is excluded from the default tool set unless the operator
// opts in (see ../tools.ts), and every call must carry the CASTLE_ADMIN_TOKEN
// M2M secret as `admin_token`. Holding the MCP read token alone is not enough.

import { config } from "../../config.ts";
import { app } from "../../state.ts";
import { isValidUsername, normalizeUsername } from "../../users/derive.ts";
import { store } from "../../users/index.ts";
import { provisionUser } from "../../users/provision.ts";
import type { Tool } from "../tools.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requireAdminToken = (provided: unknown): void => {
  const expected = config().adminToken;
  if (!expected) {
    throw new Error("provisioning is disabled: CASTLE_ADMIN_TOKEN is not configured on this instance");
  }
  if (typeof provided !== "string" || provided !== expected) {
    throw new Error("admin_token is missing or invalid");
  }
};

export const provisionTools: Tool[] = [
  {
    name: "castle.users.provision",
    description:
      "WRITE: create (or update the password of) a Castle user and fan the credentials out to every " +
      "registered app connection (Tangle, Stohr, …). Requires the CASTLE_ADMIN_TOKEN M2M secret in " +
      "`admin_token`. Off by default — the operator must enable write tools to advertise this.",
    inputSchema: {
      type: "object",
      properties: {
        admin_token: { type: "string", description: "The CASTLE_ADMIN_TOKEN M2M secret" },
        email: { type: "string", description: "Email address (also the login identifier)" },
        password: { type: "string", description: "Password, at least 8 characters" },
        username: { type: "string", description: "Optional username; derived from email when omitted" },
        name: { type: "string", description: "Optional display name; derived from email when omitted" },
      },
      required: ["admin_token", "email", "password"],
    },
    handler: async ({ admin_token, email, password, username, name }) => {
      requireAdminToken(admin_token);

      const e = String(email ?? "")
        .trim()
        .toLowerCase();
      const pw = String(password ?? "");
      if (!EMAIL_RE.test(e)) throw new Error("invalid email");
      if (pw.length < 8) throw new Error("password must be at least 8 characters");

      let uname = username ? String(username).trim() : undefined;
      if (uname) {
        uname = normalizeUsername(uname);
        if (!isValidUsername(uname)) {
          throw new Error("username must be 3-32 chars: lowercase letters, digits, underscores");
        }
      }

      const db = app().db;
      const existing = await store.findByEmail(db, e);
      if (existing) {
        const hash = await store.setPassword(db, existing.id, pw);
        const results = await provisionUser(db, existing, hash);
        return { user: existing, created: false, provisions: results };
      }

      const { user, hash } = await store.create(db, {
        email: e,
        password: pw,
        username: uname,
        name: name ? String(name).trim() : undefined,
      });
      const results = await provisionUser(db, user, hash);
      return { user, created: true, provisions: results };
    },
  },
];
