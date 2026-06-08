// Read-only control-plane tools over Castle's user directory. These call the
// users store in-process (no HTTP hop) so an AI client sees exactly the same
// rows the admin UI does.

import { app } from "../../state.ts";
import { store } from "../../users/index.ts";
import type { Tool } from "../tools.ts";

export const userTools: Tool[] = [
  {
    name: "castle.users.list",
    description: "List all Castle users (id, email, username, name, created_at).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({ users: await store.list(app().db) }),
  },

  {
    name: "castle.users.get",
    description: "Fetch a single Castle user by numeric id. Returns null if not found.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Numeric user id" } },
      required: ["id"],
    },
    handler: async ({ id }) => {
      const n = Number(id);
      if (!Number.isFinite(n) || n <= 0) throw new Error("id must be a positive number");
      return { user: await store.get(app().db, n) };
    },
  },

  {
    name: "castle.users.by_email",
    description: "Fetch a single Castle user by email address. Returns null if not found.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "Email address" } },
      required: ["email"],
    },
    handler: async ({ email }) => {
      const e = String(email ?? "")
        .trim()
        .toLowerCase();
      if (!e) throw new Error("email is required");
      return { user: await store.findByEmail(app().db, e) };
    },
  },
];
