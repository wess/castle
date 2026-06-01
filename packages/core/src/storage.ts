export type PoolKind = "dir" | "lvm" | "zfs" | "btrfs";

export type Pool = {
  id: string;
  name: string;
  kind: PoolKind;
  path: string;
  totalBytes: number;
  usedBytes: number;
};

export type Volume = {
  id: string;
  pool: string;
  name: string;
  bytes: number;
  attached?: string;
};
