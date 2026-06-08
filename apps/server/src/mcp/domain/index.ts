// Castle control-plane MCP tools (task M6.3). Read-only directory/health
// inspection plus one explicitly-gated write tool. Grouped so tools.ts can
// advertise the read set by default and only fold in writes when the operator
// opts in.

import type { Tool } from "../tools.ts";
import { oidcAppTools } from "./apps.ts";
import { healthTools } from "./health.ts";
import { provisionTools } from "./provision.ts";
import { userTools } from "./users.ts";

export const controlPlaneReadTools: Tool[] = [...userTools, ...oidcAppTools, ...healthTools];

export const controlPlaneWriteTools: Tool[] = [...provisionTools];

export { healthTools, oidcAppTools, provisionTools, userTools };
