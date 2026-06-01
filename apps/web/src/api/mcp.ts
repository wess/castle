import { get, post, put } from "./client.ts";

export type McpTool = { name: string; description: string };

export type McpInfo = {
  enabled: boolean;
  token: string;
  endpoint: string;
  tools: McpTool[];
};

export const info = () => get<McpInfo>("/mcp/info");
export const setEnabled = (enabled: boolean) => put<{ enabled: boolean; token: string }>("/mcp/enabled", { enabled });
export const regenerate = () => post<{ token: string }>("/mcp/regenerate");
