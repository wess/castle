export type ExecResult = { code: number; stdout: string; stderr: string };

export const exec = async (cmd: string[]): Promise<ExecResult> => {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { code: await proc.exited, stdout, stderr };
};

export const must = async (cmd: string[]): Promise<string> => {
  const r = await exec(cmd);
  if (r.code !== 0) throw new Error(`${cmd.join(" ")} → exit ${r.code}: ${r.stderr.trim()}`);
  return r.stdout;
};
