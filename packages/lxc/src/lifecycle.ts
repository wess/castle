import { must } from "./exec.ts";

export const start = (name: string): Promise<string> => must(["lxc-start", "-n", name, "-d"]);

export const stop = (name: string): Promise<string> => must(["lxc-stop", "-n", name]);

export const freeze = (name: string): Promise<string> => must(["lxc-freeze", "-n", name]);

export const unfreeze = (name: string): Promise<string> => must(["lxc-unfreeze", "-n", name]);

export const destroy = (name: string, force = false): Promise<string> =>
  must(force ? ["lxc-destroy", "-n", name, "-f"] : ["lxc-destroy", "-n", name]);
