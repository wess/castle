import { ActionIcon, Anchor, Button, Card, Group, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Square, Terminal as TerminalIcon, Trash } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { Console } from "../../components/console/index.tsx";
import { StateBadge } from "../../components/statebadge.tsx";
import { useLiveQuery } from "../../live/index.ts";

const useAction = (fn: (name: string) => Promise<unknown>, label: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lxc"] });
      notifications.show({ message: label, color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });
};

export const LxcList = () => {
  const { data, isLoading } = useLiveQuery({
    queryKey: ["lxc"],
    queryFn: api.lxc.list,
    topic: "lxc",
  });
  const start = useAction(api.lxc.start, "Started");
  const stop = useAction(api.lxc.stop, "Stopped");
  const destroy = useAction((n) => api.lxc.destroy(n, true), "Destroyed");
  const [term, setTerm] = useState<string | null>(null);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>LXC</Title>
        <Button component={Link} to="/lxc/new" leftSection={<Plus size={16} />}>
          New LXC
        </Button>
      </Group>

      <Card withBorder padding={0} radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>State</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.length === 0 && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No LXC containers yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Anchor component={Link} to={`/lxc/${c.name}`} size="sm" fw={500}>
                    {c.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <StateBadge state={c.state} />
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    {c.state === "running" ? (
                      <Tooltip label="Stop">
                        <ActionIcon variant="subtle" color="yellow" onClick={() => stop.mutate(c.name)}>
                          <Square size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Start">
                        <ActionIcon variant="subtle" color="teal" onClick={() => start.mutate(c.name)}>
                          <Play size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {c.state === "running" && (
                      <Tooltip label="Console">
                        <ActionIcon variant="subtle" onClick={() => setTerm(c.name)}>
                          <TerminalIcon size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Destroy">
                      <ActionIcon variant="subtle" color="red" onClick={() => destroy.mutate(c.name)}>
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

      {term && <Console kind="lxc" target={term} title={`Console — ${term}`} opened onClose={() => setTerm(null)} />}
    </Stack>
  );
};
