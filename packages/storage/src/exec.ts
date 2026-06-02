export type ExecResult = { code: number; stdout: string; stderr: string };

export const exec = async (cmd: string[]): Promise<ExecResult> => {
  try {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    return { code: await proc.exited, stdout, stderr };
  } catch (e) {
    // Tool not installed (ENOENT) or otherwise unspawnable — treat as a failed
    // command so discovery (zfs/lvm) degrades to "no pools" instead of throwing.
    return { code: 127, stdout: "", stderr: e instanceof Error ? e.message : String(e) };
  }
};
