import { exec } from "./exec.ts";

export const attach = async (name: string, cmd: string[]): Promise<{ code: number; stdout: string; stderr: string }> =>
  exec(["lxc-attach", "-n", name, "--", ...cmd]);
