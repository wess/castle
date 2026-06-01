import { type ConnectionConfig, createAdapter, type DbAdapter } from "./adapters/index.ts";

const live = new Map<string, DbAdapter>();

export const open = async (config: ConnectionConfig): Promise<void> => {
  if (live.has(config.id)) return;
  const adapter = createAdapter(config);
  await adapter.connect();
  live.set(config.id, adapter);

  if (config.startupCommands) {
    const cmds = config.startupCommands
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const cmd of cmds) {
      try {
        await adapter.query(cmd);
      } catch {
        /* non-fatal */
      }
    }
  }
};

export const close = async (id: string): Promise<void> => {
  const adapter = live.get(id);
  if (adapter) {
    await adapter.disconnect();
    live.delete(id);
  }
};

export const get = (id: string): DbAdapter => {
  const adapter = live.get(id);
  if (!adapter) throw new Error(`no live connection: ${id}`);
  return adapter;
};

export const isOpen = (id: string): boolean => live.has(id);
