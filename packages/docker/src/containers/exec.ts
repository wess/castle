import type { DockerClient, HijackedSocket } from "../client.ts";

export type ExecOptions = {
  cmd: string[];
  tty?: boolean;
  env?: string[];
  user?: string;
  workingDir?: string;
};

export type ExecHandle = {
  id: string;
  socket: HijackedSocket;
  resize: (cols: number, rows: number) => Promise<void>;
};

export const createExec = async (client: DockerClient, container: string, opts: ExecOptions): Promise<string> => {
  const res = await client.call<{ Id: string }>("POST", `/containers/${encodeURIComponent(container)}/exec`, {
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: opts.tty ?? true,
    Cmd: opts.cmd,
    Env: opts.env,
    User: opts.user,
    WorkingDir: opts.workingDir,
  });
  return res.Id;
};

export const startExec = async (client: DockerClient, execId: string, tty: boolean): Promise<HijackedSocket> =>
  client.hijack("POST", `/exec/${encodeURIComponent(execId)}/start`, { Detach: false, Tty: tty });

export const resizeExec = async (client: DockerClient, execId: string, cols: number, rows: number): Promise<void> => {
  await client.raw("POST", `/exec/${encodeURIComponent(execId)}/resize?h=${rows}&w=${cols}`);
};

export const openExec = async (client: DockerClient, container: string, opts: ExecOptions): Promise<ExecHandle> => {
  const tty = opts.tty ?? true;
  const id = await createExec(client, container, { ...opts, tty });
  const socket = await startExec(client, id, tty);
  return {
    id,
    socket,
    resize: (cols, rows) => resizeExec(client, id, cols, rows),
  };
};
