import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug2, Plus, ShieldCheck, Trash } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { useLiveQuery } from "../../live/index.ts";

export const Connections = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useLiveQuery({
    queryKey: ["connections"],
    queryFn: api.connections.list,
    topic: "connections",
  });

  const [adding, setAdding] = useState(false);

  const onError = (e: unknown) => notifications.show({ message: errorMessage(e), color: "red" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["connections"] });

  const form = useForm({
    initialValues: { appId: "tangle", instance: "", hostname: "", token: "" },
    validate: {
      instance: (v) => (!v.trim() ? "required" : null),
      hostname: (v) => (!v.trim() ? "required" : null),
      token: (v) => (v.length < 16 ? "min 16 characters" : null),
    },
  });

  const addMut = useMutation({
    mutationFn: api.connections.create,
    onSuccess: () => {
      invalidate();
      notifications.show({ message: "Connection added", color: "teal" });
      setAdding(false);
      form.reset();
    },
    onError,
  });

  const checkMut = useMutation({
    mutationFn: (id: number) => api.connections.check(id),
    onSuccess: (res, id) => {
      const conn = data?.find((c) => c.id === id);
      notifications.show({
        message: res.ok ? `${conn?.instance ?? id} is reachable` : `Check failed: ${res.error ?? "unknown"}`,
        color: res.ok ? "teal" : "red",
      });
    },
    onError,
  });

  const delMut = useMutation({
    mutationFn: api.connections.remove,
    onSuccess: () => {
      invalidate();
      notifications.show({ message: "Removed", color: "teal" });
    },
    onError,
  });

  return (
    <Stack gap="sm" maw={960}>
      <Group justify="space-between">
        <Title order={3}>App connections</Title>
        <Button size="xs" variant="default" leftSection={<Plus size={14} />} onClick={() => setAdding(true)}>
          Add connection
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Each connection points Castle at a running Tangle or Stohr instance. Castle-installed apps are added
        automatically. For external instances, paste the hostname and the value you set as{" "}
        <code>CASTLE_ADMIN_TOKEN</code>.
      </Text>

      <Card withBorder padding={0} radius="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>App</Table.Th>
              <Table.Th>Instance</Table.Th>
              <Table.Th>Hostname</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {!isLoading && data?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No app connections yet. Install Tangle or Stohr from the Apps page, or add an external instance.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Group gap="xs">
                    <Plug2 size={14} style={{ opacity: 0.6 }} />
                    <Text size="sm" tt="capitalize">
                      {c.appId}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{c.instance}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {c.hostname}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" color={c.managed ? "indigo" : "gray"} variant="light">
                    {c.managed ? "managed" : "external"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <Tooltip label="Probe /castle/health">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => checkMut.mutate(c.id)}
                        loading={checkMut.isPending && checkMut.variables === c.id}
                      >
                        <ShieldCheck size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remove">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          if (confirm(`Remove ${c.instance}? Future user changes won't be pushed there.`)) {
                            delMut.mutate(c.id);
                          }
                        }}
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

      <Modal opened={adding} onClose={() => setAdding(false)} title="Add app connection" centered>
        <form
          onSubmit={form.onSubmit((v) =>
            addMut.mutate({
              appId: v.appId as "tangle" | "stohr",
              instance: v.instance.trim(),
              hostname: v.hostname.trim().toLowerCase(),
              token: v.token,
            }),
          )}
        >
          <Stack gap="sm">
            <Select
              label="App"
              data={[
                { value: "tangle", label: "Tangle" },
                { value: "stohr", label: "Stohr" },
              ]}
              {...form.getInputProps("appId")}
            />
            <TextInput
              label="Instance name"
              placeholder="git"
              description="Free-form label shown in the Users page."
              {...form.getInputProps("instance")}
            />
            <TextInput
              label="Hostname"
              placeholder="git.local"
              description="Castle reaches the instance at http://<hostname>/castle/*"
              {...form.getInputProps("hostname")}
            />
            <TextInput
              label="Admin token"
              placeholder="paste CASTLE_ADMIN_TOKEN"
              description="The value the app's container has as CASTLE_ADMIN_TOKEN."
              {...form.getInputProps("token")}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={addMut.isPending}>
                Add
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
