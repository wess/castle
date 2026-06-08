// Read-only view of Castle's registered OIDC relying parties (the "apps" that
// log in through Castle's IdP). Secrets are never returned — only the public
// client metadata that the admin UI already exposes.

import { list as listClients } from "../../idp/clients.ts";
import { app } from "../../state.ts";
import type { Tool } from "../tools.ts";

export const oidcAppTools: Tool[] = [
  {
    name: "castle.apps.list",
    description:
      "List OIDC clients (relying-party apps) registered with Castle's identity provider. " +
      "Returns public metadata only — no client secrets.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const clients = await listClients(app().db);
      return {
        clients: clients.map((c) => ({
          id: c.id,
          client_id: c.client_id,
          name: c.name,
          app_id: c.app_id,
          instance: c.instance,
          redirect_uris: c.redirect_uris,
          allowed_scopes: c.allowed_scopes,
          is_official: c.is_official,
          created_at: c.created_at,
          revoked_at: c.revoked_at,
        })),
      };
    },
  },
];
