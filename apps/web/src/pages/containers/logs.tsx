import { Button, Card, Group, ScrollArea, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { getToken } from "../../auth/storage.ts";

type Props = { id: string };

export const Logs = ({ id }: Props) => {
  const [lines, setLines] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const stop = () => {
    cancelRef.current?.abort();
    cancelRef.current = null;
    setStreaming(false);
  };

  const start = async () => {
    if (streaming) return;
    setLines([]);
    setStreaming(true);
    const ac = new AbortController();
    cancelRef.current = ac;
    try {
      const token = getToken();
      const res = await fetch(`/api/containers/${id}/logs?tail=500`, {
        signal: ac.signal,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok || !res.body) throw new Error(`${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        if (parts.length) {
          setLines((prev) => [...prev, ...parts].slice(-2000));
        }
      }
      if (buffer) setLines((prev) => [...prev, buffer]);
    } catch {
      // aborted or finished
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, stop]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Logs</Text>
        <Group gap="xs">
          <Button size="xs" variant="subtle" onClick={() => setLines([])}>
            Clear
          </Button>
          <Button size="xs" variant="subtle" onClick={streaming ? stop : start}>
            {streaming ? "Pause" : "Resume"}
          </Button>
        </Group>
      </Group>
      <ScrollArea h={400} type="auto">
        <pre
          style={{
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            fontSize: 12,
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {lines.join("\n") || (streaming ? "Connecting…" : "No logs.")}
          <div ref={bottomRef} />
        </pre>
      </ScrollArea>
    </Card>
  );
};
