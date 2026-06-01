export const reload = async (): Promise<void> => {
  const proc = Bun.spawn(["sudo", "-n", "/usr/bin/systemctl", "restart", "castle-mdns.service"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`reload failed (exit ${code}): ${err.trim()}`);
  }
};
