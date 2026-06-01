import { Modal, Stack, Text } from "@mantine/core";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { getToken } from "../../auth/storage.ts";

export type ConsoleKind = "containers" | "lxc";

export type ConsoleProps = {
  kind: ConsoleKind;
  target: string;
  title: string;
  opened: boolean;
  onClose: () => void;
};

const buildWsUrl = (kind: ConsoleKind, target: string, cols: number, rows: number, cmd: string[]): string => {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const token = getToken();
  const params = new URLSearchParams({
    cols: String(cols),
    rows: String(rows),
    cmd: JSON.stringify(cmd),
  });
  if (token) params.set("token", token);
  return `${proto}//${window.location.host}/api/${kind}/${encodeURIComponent(target)}/exec?${params}`;
};

export const Console = ({ kind, target, title, opened, onClose }: ConsoleProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!opened || !containerRef.current) return;

    const term = new Terminal({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: { background: "#0b0d10" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fit;

    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {}
      const { cols, rows } = term;
      const url = buildWsUrl(kind, target, cols, rows, ["/bin/sh"]);
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        term.focus();
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") {
          term.write(ev.data);
        } else {
          term.write(new Uint8Array(ev.data as ArrayBuffer));
        }
      };
      ws.onerror = () => term.write("\r\n\x1b[31mconnection error\x1b[0m\r\n");
      ws.onclose = (ev) => term.write(`\r\n[disconnected${ev.reason ? `: ${ev.reason}` : ""}]\r\n`);

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "in", data }));
      });

      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "resize", cols, rows }));
      });
    });

    const onResize = () => {
      try {
        fit.fit();
      } catch {}
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      try {
        wsRef.current?.close();
      } catch {}
      try {
        term.dispose();
      } catch {}
      termRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, [opened, kind, target]);

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="xl" centered padding="xs">
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          {kind === "lxc"
            ? "lxc-attach session — full-screen apps may not render correctly without a PTY."
            : "Docker exec session — Ctrl-D to exit."}
        </Text>
        <div
          ref={containerRef}
          style={{
            height: 480,
            background: "#0b0d10",
            padding: 8,
            borderRadius: 6,
          }}
        />
      </Stack>
    </Modal>
  );
};
