export type DockerClient = {
  socket: string;
  apiVersion: string;
  call: <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>;
  raw: (method: string, path: string, body?: unknown) => Promise<Response>;
  hijack: (method: string, path: string, body?: unknown) => Promise<HijackedSocket>;
};

export type HijackedSocket = {
  write: (data: Uint8Array | string) => void;
  onData: (cb: (chunk: Uint8Array) => void) => void;
  onClose: (cb: () => void) => void;
  close: () => void;
};

export type DockerClientOptions = {
  socket?: string;
  apiVersion?: string;
};

const CRLF = "\r\n";

const buildHijackRequest = (method: string, path: string, apiVersion: string, body?: unknown): Uint8Array => {
  const payload = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  const headers = [
    `${method} /${apiVersion}${path} HTTP/1.1`,
    "Host: localhost",
    "Upgrade: tcp",
    "Connection: Upgrade",
    "Content-Type: application/json",
    `Content-Length: ${Buffer.byteLength(payload)}`,
    "",
    payload,
  ].join(CRLF);
  return new TextEncoder().encode(headers);
};

const splitHeaders = (buf: Uint8Array): { headerEnd: number; status: number } | null => {
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a && buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) {
      const head = new TextDecoder().decode(buf.slice(0, i));
      const first = head.split(CRLF)[0] ?? "";
      const parts = first.split(" ");
      const status = Number(parts[1] ?? "0");
      return { headerEnd: i + 4, status };
    }
  }
  return null;
};

export const createClient = (opts: DockerClientOptions = {}): DockerClient => {
  const socket = opts.socket ?? "/var/run/docker.sock";
  const apiVersion = opts.apiVersion ?? "v1.43";

  const raw = async (method: string, path: string, body?: unknown): Promise<Response> => {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit & { unix?: string } = { method, headers, unix: socket };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return fetch(`http://localhost/${apiVersion}${path}`, init);
  };

  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await raw(method, path, body);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`docker ${method} ${path} → ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as T;
  };

  const hijack = async (method: string, path: string, body?: unknown): Promise<HijackedSocket> => {
    const dataCbs: Array<(c: Uint8Array) => void> = [];
    const closeCbs: Array<() => void> = [];
    let headersParsed = false;
    let leftover: Uint8Array | null = null;
    let resolveReady: (s: any) => void = () => {};
    let rejectReady: (e: unknown) => void = () => {};
    const ready = new Promise<any>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const conn = await Bun.connect({
      unix: socket,
      socket: {
        data(sock, chunk) {
          if (!headersParsed) {
            const merged = leftover ? new Uint8Array([...leftover, ...chunk]) : chunk;
            const split = splitHeaders(merged);
            if (!split) {
              leftover = merged;
              return;
            }
            headersParsed = true;
            if (split.status >= 400) {
              const errBody = new TextDecoder().decode(merged.slice(split.headerEnd));
              rejectReady(new Error(`docker hijack ${method} ${path} → ${split.status}: ${errBody}`));
              sock.end();
              return;
            }
            resolveReady(sock);
            const rest = merged.slice(split.headerEnd);
            if (rest.length > 0) for (const cb of dataCbs) cb(rest);
            return;
          }
          for (const cb of dataCbs) cb(chunk);
        },
        close() {
          for (const cb of closeCbs) cb();
        },
        error(_sock, err) {
          rejectReady(err);
          for (const cb of closeCbs) cb();
        },
      },
    });

    conn.write(buildHijackRequest(method, path, apiVersion, body));
    const sock = await ready;

    return {
      write: (data) => {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        sock.write(bytes);
      },
      onData: (cb) => {
        dataCbs.push(cb);
      },
      onClose: (cb) => {
        closeCbs.push(cb);
      },
      close: () => {
        try {
          sock.end();
        } catch {}
      },
    };
  };

  return { socket, apiVersion, call, raw, hijack };
};
