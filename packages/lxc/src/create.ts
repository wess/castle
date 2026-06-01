import { must } from "./exec.ts";

export type CreateLxcSpec = {
  name: string;
  distro: string;
  release: string;
  arch: string;
  template?: string;
};

export const create = async (spec: CreateLxcSpec): Promise<void> => {
  const template = spec.template ?? "download";
  await must([
    "lxc-create",
    "-n",
    spec.name,
    "-t",
    template,
    "--",
    "--dist",
    spec.distro,
    "--release",
    spec.release,
    "--arch",
    spec.arch,
  ]);
};
