import { type Tool, tools } from "./tools.ts";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
};

const findTool = (name: string): Tool | undefined => tools.find((t) => t.name === name);

export const handle = async (req: JsonRpcRequest): Promise<JsonRpcResponse> => {
  const id = req.id ?? 0;

  if (req.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "castle-mcp", version: "0.0.1" },
        capabilities: { tools: {} },
      },
    };
  }

  if (req.method === "notifications/initialized") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (req.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    };
  }

  if (req.method === "tools/call") {
    const p = req.params as { name: string; arguments?: Record<string, unknown> };
    const t = findTool(p.name);
    if (!t) return { jsonrpc: "2.0", id, error: { code: -32601, message: `unknown tool: ${p.name}` } };
    try {
      const result = await t.handler(p.arguments ?? {});
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      };
    } catch (e) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        },
      };
    }
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${req.method}` } };
};

export const toolSummaries = (): Array<{ name: string; description: string }> =>
  tools.map((t) => ({ name: t.name, description: t.description }));
