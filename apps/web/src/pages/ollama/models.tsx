import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Progress,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Trash, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { useLiveQuery } from "../../live/index.ts";

const formatSize = (bytes: number): string => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n.toFixed(1)} ${units[u]}`;
};

const statusColor = (s: api.ollama.PullJob["status"]): string => {
  switch (s) {
    case "running":
      return "blue";
    case "success":
      return "teal";
    case "error":
      return "red";
    case "cancelled":
      return "gray";
  }
};

export const OllamaModels = () => {
  const qc = useQueryClient();
  const {
    data: modelList,
    isLoading,
    refetch,
  } = useLiveQuery({
    queryKey: ["ollama", "models"],
    queryFn: api.ollama.list,
    topic: "ollama:models",
  });
  const { data: status } = useLiveQuery({
    queryKey: ["ollama", "status"],
    queryFn: api.ollama.status,
    topic: "ollama:status",
  });
  const { data: pulls } = useLiveQuery({
    queryKey: ["ollama", "pulls"],
    queryFn: api.ollama.listPulls,
    topic: "ollama:pulls",
  });

  // Toast on pull completion exactly once per (model, endedAt).
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const p of pulls ?? []) {
      if (!p.endedAt) continue;
      const key = `${p.model}@${p.endedAt}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      if (p.status === "success") {
        notifications.show({ title: "Model pulled", message: p.model, color: "teal" });
        qc.invalidateQueries({ queryKey: ["ollama", "models"] });
      } else if (p.status === "error") {
        notifications.show({
          title: `Pull failed: ${p.model}`,
          message: p.error ?? "unknown error",
          color: "red",
          autoClose: 8_000,
        });
      }
    }
  }, [pulls, qc]);

  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [pullName, setPullName] = useState("");

  const startMut = useMutation({
    mutationFn: (name: string) => api.ollama.startPull(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ollama", "pulls"] });
      setPullModalOpen(false);
      setPullName("");
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const cancelMut = useMutation({
    mutationFn: (name: string) => api.ollama.cancelPull(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ollama", "pulls"] }),
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const removeMut = useMutation({
    mutationFn: (name: string) => api.ollama.remove(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ollama", "models"] });
      notifications.show({ message: "Model removed", color: "teal" });
    },
    onError: (e) => notifications.show({ title: "Error", message: errorMessage(e), color: "red" }),
  });

  const activePulls = (pulls ?? []).filter((p) => p.status === "running" || !p.endedAt);
  const recentPulls = (pulls ?? []).filter((p) => p.endedAt && p.status !== "running" && p.status !== "success");

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" c={status?.ok ? "teal" : "red"}>
            {status?.ok ? "● connected" : "○ unreachable"}
          </Text>
          <Text size="xs" c="dimmed">
            {status?.url}
          </Text>
        </Group>
        <Group gap="xs">
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" onClick={() => refetch()}>
              <RefreshCw size={14} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<Download size={14} />} onClick={() => setPullModalOpen(true)} disabled={!status?.ok}>
            Pull model
          </Button>
        </Group>
      </Group>

      {activePulls.length > 0 && (
        <Stack gap="xs">
          {activePulls.map((p) => {
            const pct = p.total > 0 ? (p.completed / p.total) * 100 : null;
            return (
              <Card key={p.model} withBorder padding="sm">
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {p.model}
                      </Text>
                      <Badge size="xs" variant="light" color={statusColor(p.status)}>
                        {p.status}
                      </Badge>
                    </Group>
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">
                        {p.step}
                      </Text>
                      <Tooltip label="Cancel">
                        <ActionIcon variant="subtle" size="sm" onClick={() => cancelMut.mutate(p.model)}>
                          <X size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                  <Progress value={pct ?? 0} animated={pct === null} />
                  {p.total > 0 && (
                    <Text size="xs" c="dimmed">
                      {formatSize(p.completed)} of {formatSize(p.total)}
                    </Text>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {recentPulls.length > 0 && (
        <Stack gap={4}>
          {recentPulls.map((p) => (
            <Card key={`${p.model}-${p.endedAt}`} withBorder padding="xs">
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm">{p.model}</Text>
                  <Badge size="xs" variant="light" color={statusColor(p.status)}>
                    {p.status}
                  </Badge>
                </Group>
                {p.error && (
                  <Text size="xs" c="red" truncate maw={500}>
                    {p.error}
                  </Text>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Card withBorder padding={0} radius="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Params</Table.Th>
              <Table.Th>Modified</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {!status?.ok && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Stack align="center" py="lg" gap="xs">
                    <Text size="sm" c="dimmed">
                      Ollama isn't reachable at {status?.url}.
                    </Text>
                    <Anchor href="/apps" size="sm">
                      Install via Apps →
                    </Anchor>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            )}
            {modelList?.length === 0 && status?.ok && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No models. Pull one to get started.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {modelList?.map((m) => (
              <Table.Tr key={m.digest}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {m.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatSize(m.size)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {m.details?.parameter_size ?? "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {new Date(m.modified_at).toLocaleString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <Tooltip label="Remove">
                      <ActionIcon variant="subtle" color="red" onClick={() => removeMut.mutate(m.name)}>
                        <Trash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={pullModalOpen} onClose={() => setPullModalOpen(false)} title="Pull a model" centered>
        <Stack gap="md">
          <TextInput
            label="Model"
            placeholder="llama3.2, qwen2.5-coder:7b, etc."
            value={pullName}
            onChange={(e) => setPullName(e.currentTarget.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && pullName.trim()) startMut.mutate(pullName.trim());
            }}
          />
          <Text size="xs" c="dimmed">
            Pulls run in the background — you can leave this page. Browse models at{" "}
            <Anchor href="https://ollama.com/library" target="_blank" size="xs">
              ollama.com/library
            </Anchor>
            .
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPullModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => startMut.mutate(pullName.trim())}
              disabled={!pullName.trim()}
              loading={startMut.isPending}
            >
              Pull
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
