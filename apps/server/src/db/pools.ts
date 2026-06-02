import type { Db } from "./init.ts";

// Admin-registered directory pools (mounted filesystems Castle should track).
// ZFS/LVM pools are auto-discovered; these are plain mounts an admin opts in to.
export type PoolRow = { id: string; name: string; kind: string; path: string };

export const list = async (db: Db): Promise<PoolRow[]> =>
  (await db`SELECT id, name, kind, path FROM pools ORDER BY created_at`) as PoolRow[];

export const add = async (db: Db, name: string, path: string): Promise<PoolRow> => {
  const id = `dir:${name}`;
  await db`
    INSERT INTO pools (id, name, kind, path, created_at)
    VALUES (${id}, ${name}, 'dir', ${path}, EXTRACT(EPOCH FROM NOW())::BIGINT)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, path = EXCLUDED.path
  `;
  return { id, name, kind: "dir", path };
};

export const remove = async (db: Db, id: string): Promise<void> => {
  await db`DELETE FROM pools WHERE id = ${id}`;
};
