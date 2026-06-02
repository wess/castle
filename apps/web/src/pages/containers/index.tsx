import { ActionIcon, Anchor, Button, Card, Group, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, RotateCw, Square, Terminal as TerminalIcon, Trash } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { Console } from "../../components/console/index.tsx";
import { StateBadge } from "../../components/statebadge.tsx";
import { ago, shortId } from "../../format.ts";
import { useLiveQuery } from "../../live/index.ts";

const useAction = (fn: (id: string) => Promise<unknown>, label: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      notifications.show({ message: label, color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });
};

export const Containers = () => {
  const { data, isLoading } = useLiveQuery({
    queryKey: ["containers"],
    queryFn: api.containers.list,
    topic: "containers",
  });

  const start = useAction(api.containers.start, "Started");
  const stop = useAction(api.containers.stop, "Stopped");
  const restart = useAction(api.containers.restart, "Restarted");
  const remove = useAction((id) => api.containers.remove(id, true), "Removed");
  const [term, setTerm] = useState<{ id: string; name: string } | null>(null);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Containers</Title>
        <Button component={Link} to="/containers/new" leftSection={<Plus size={16} />}>
          New container
        </Button>
      </Group>

      <Card withBorder padding={0} radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Image</Table.Th>
              <Table.Th>State</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Ports</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.length === 0 && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No containers yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Anchor component={Link} to={`/containers/${c.id}`} size="sm" fw={500}>
                    {c.name || shortId(c.id)}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {c.image}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <StateBadge state={c.state} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {ago(c.createdAt)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {c.ports.length ? c.ports.map((p) => `${p.host}→${p.container}`).join(", ") : "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    {c.state === "running" ? (
                      <Tooltip label="Stop">
                        <ActionIcon
                          variant="subtle"
                          color="yellow"
                          onClick={() => stop.mutate(c.id)}
                          loading={stop.isPending}
                        >
                          <Square size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Start">
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          onClick={() => start.mutate(c.id)}
                          loading={start.isPending}
                        >
                          <Play size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Restart">
                      <ActionIcon variant="subtle" onClick={() => restart.mutate(c.id)}>
                        <RotateCw size={14} />
                      </ActionIcon>
                    </Tooltip>
                    {c.state === "running" && (
                      <Tooltip label="Console">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => setTerm({ id: c.id, name: c.name || shortId(c.id) })}
                        >
                          <TerminalIcon size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Remove">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => remove.mutate(c.id)}
                        loading={remove.isPending}
                      >
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

      {term && (
        <Console
          kind="containers"
          target={term.id}
          title={`Console — ${term.name}`}
          opened
          onClose={() => setTerm(null)}
        />
      )}
    </Stack>
  );
};
