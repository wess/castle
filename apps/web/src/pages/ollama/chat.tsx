import {
  ActionIcon,
  Card,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Send, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { useLiveQuery } from "../../live/index.ts";

const titleFrom = (text: string): string => {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed || "New chat";
};

const relativeTime = (epochSec: number): string => {
  const now = Date.now() / 1000;
  const diff = now - epochSec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

type LocalChat = {
  id: string | null;
  title: string;
  model: string;
  messages: api.ollama.ChatMessage[];
};

const blankChat = (model: string): LocalChat => ({ id: null, title: "New chat", model, messages: [] });

export const OllamaChat = () => {
  const qc = useQueryClient();
  const { data: models } = useLiveQuery({
    queryKey: ["ollama", "models"],
    queryFn: api.ollama.list,
    topic: "ollama:models",
  });
  // Chat list is per-user (not a broadcast topic); it stays fresh via the
  // create/update/delete mutations below rather than a poll.
  const { data: chats } = useQuery({ queryKey: ["ollama", "chats"], queryFn: api.ollama.listChats });

  const [active, setActive] = useState<LocalChat>(() => blankChat(""));
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const viewport = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active.model && models && models.length > 0) {
      setActive((c) => ({ ...c, model: models[0]!.name }));
    }
  }, [models, active.model]);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
  }, []);

  const openChat = async (id: string) => {
    try {
      const full = await api.ollama.getChat(id);
      setActive({ id: full.id, title: full.title, model: full.model, messages: full.messages });
    } catch (e) {
      notifications.show({ message: errorMessage(e), color: "red" });
    }
  };

  const newChat = () => setActive(blankChat(active.model || models?.[0]?.name || ""));

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.ollama.deleteChat(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["ollama", "chats"] });
      if (active.id === id) newChat();
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.ollama.updateChat(id, { title }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["ollama", "chats"] });
      if (active.id === updated.id) setActive((c) => ({ ...c, title: updated.title }));
      setRenamingId(null);
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const persist = async (next: LocalChat): Promise<LocalChat> => {
    if (next.id) {
      await api.ollama.updateChat(next.id, { messages: next.messages, model: next.model, title: next.title });
      return next;
    }
    const created = await api.ollama.createChat({
      title: next.title,
      model: next.model,
      messages: next.messages,
    });
    return { ...next, id: created.id };
  };

  const send = async () => {
    if (!input.trim() || !active.model || streaming) return;
    const userMsg: api.ollama.ChatMessage = { role: "user", content: input };
    const baseTitle = active.messages.length === 0 ? titleFrom(input) : active.title;
    const withUser: LocalChat = {
      ...active,
      title: baseTitle,
      messages: [...active.messages, userMsg, { role: "assistant", content: "" }],
    };
    setActive(withUser);
    setInput("");
    setStreaming(true);
    try {
      const stream = await api.ollama.chatStream(
        active.model,
        withUser.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      );
      const reader = (stream as ReadableStream<Uint8Array>)
        .pipeThrough(new TextDecoderStream() as any)
        .getReader() as ReadableStreamDefaultReader<string>;
      let buf = "";
      let assistant = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        let nl = buf.indexOf("\n");
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          nl = buf.indexOf("\n");
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as { message?: { content?: string } };
            const chunk = evt.message?.content ?? "";
            if (chunk) {
              assistant += chunk;
              setActive((prev) => {
                const copy = [...prev.messages];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, content: assistant };
                return { ...prev, messages: copy };
              });
            }
          } catch {}
        }
      }
      const finalChat: LocalChat = {
        ...withUser,
        messages: [...withUser.messages.slice(0, -1), { role: "assistant", content: assistant }],
      };
      const persisted = await persist(finalChat);
      setActive(persisted);
      qc.invalidateQueries({ queryKey: ["ollama", "chats"] });
    } catch (e) {
      notifications.show({ message: errorMessage(e), color: "red" });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Group align="stretch" gap="md" h="calc(100vh - 200px)" wrap="nowrap">
      <Card
        withBorder
        padding={0}
        radius="md"
        w={260}
        style={{ flexShrink: 0, display: "flex", flexDirection: "column" }}
      >
        <Stack gap={6} p="sm">
          <Select
            placeholder="Pick a model"
            data={(models ?? []).map((m) => ({ value: m.name, label: m.name }))}
            value={active.model || null}
            onChange={(v) => setActive((c) => ({ ...c, model: v ?? "" }))}
            searchable
            size="xs"
          />
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Chats
            </Text>
            <Tooltip label="New chat">
              <ActionIcon variant="subtle" onClick={newChat}>
                <Plus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            {chats?.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                No chats yet.
              </Text>
            )}
            {chats?.map((c) => (
              <Group key={c.id} wrap="nowrap" gap={0} pr="xs" style={{ alignItems: "stretch" }}>
                {renamingId === c.id ? (
                  <TextInput
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.currentTarget.value)}
                    onBlur={() => setRenamingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameMut.mutate({ id: c.id, title: renameValue });
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    autoFocus
                    size="xs"
                    style={{ flex: 1, padding: 6 }}
                  />
                ) : (
                  <NavLink
                    label={c.title}
                    description={`${c.model} · ${relativeTime(c.updated_at)}`}
                    active={active.id === c.id}
                    onClick={() => openChat(c.id)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                )}
                <Menu position="bottom-end" withArrow>
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" style={{ alignSelf: "center" }}>
                      <MoreHorizontal size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<Pencil size={14} />}
                      onClick={() => {
                        setRenamingId(c.id);
                        setRenameValue(c.title);
                      }}
                    >
                      Rename
                    </Menu.Item>
                    <Menu.Item color="red" leftSection={<Trash size={14} />} onClick={() => deleteMut.mutate(c.id)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            ))}
          </Stack>
        </ScrollArea>
      </Card>

      <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm" truncate>
          {active.title}
        </Text>

        <Card withBorder padding={0} radius="md" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ScrollArea viewportRef={viewport} style={{ flex: 1 }} p="md">
            {active.messages.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                Start a conversation.
              </Text>
            ) : (
              <Stack gap="md">
                {active.messages.map((m, i) => (
                  <Group key={i} align="flex-start" wrap="nowrap" gap="sm">
                    <Text size="xs" fw={600} c={m.role === "user" ? "indigo" : "teal"} miw={64}>
                      {m.role === "user" ? "you" : "model"}
                    </Text>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap", flex: 1 }}>
                      {m.content || (streaming && i === active.messages.length - 1 ? "…" : "")}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Card>

        <Group gap="xs" align="flex-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder={active.model ? `Message ${active.model}…` : "Pick a model first"}
            autosize
            minRows={1}
            maxRows={6}
            style={{ flex: 1 }}
            disabled={!active.model || streaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <ActionIcon size="lg" onClick={send} loading={streaming} disabled={!active.model || !input.trim()}>
            <Send size={16} />
          </ActionIcon>
        </Group>
      </Stack>
    </Group>
  );
};
