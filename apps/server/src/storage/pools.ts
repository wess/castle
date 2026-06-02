import type { Pool } from "@castle/core";
import { dir, lvm, zfs } from "@castle/storage";
import { type Db, pools as registry } from "../db/index.ts";

export const resolveDir = async (name: string, path: string): Promise<Pool> =>
  (await dir.fromPath(name, path)) ?? { id: `dir:${name}`, name, kind: "dir", path, totalBytes: 0, usedBytes: 0 };

// Auto-discovered zfs/lvm + the always-present root + admin-registered dir
// pools, resolved to live usage. Shared by the REST route and the event engine
// so both report identical data.
export const collectPools = async (db: Db): Promise<Pool[]> => {
  const [z, l, root, registered] = await Promise.all([
    zfs.pools(),
    lvm.pools(),
    dir.fromPath("root", "/"),
    registry.list(db),
  ]);
  const pools = [...z, ...l];
  if (root) pools.push(root);
  for (const r of registered) pools.push(await resolveDir(r.name, r.path));
  return pools;
};
