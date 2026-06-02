import { ActionIcon, Button, Card, Group, Modal, Progress, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { bytes } from "../../format.ts";
import { useLiveQuery } from "../../live/index.ts";

// Auto-discovered pools (root, zfs:*, lvm:*) aren't admin-managed; only
// registered directory mounts can be removed from the UI.
const removable = (id: string) => id.startsWith("dir:") && id !== "dir:root";

export const Storage = () => {
  const qc = useQueryClient();
  const pools = useLiveQuery({ queryKey: ["pools"], queryFn: api.storage.pools, topic: "pools" });
  const volumes = useLiveQuery({ queryKey: ["volumes"], queryFn: api.storage.volumes, topic: "volumes" });
  const [adding, setAdding] = useState(false);

  const form = useForm({
    initialValues: { name: "", path: "" },
    validate: {
      name: (v) => (/^[a-z0-9][a-z0-9.-]*$/i.test(v.trim()) ? null : "letters, digits, dot or dash"),
      path: (v) => (v.trim().startsWith("/") ? null : "must be an absolute path"),
    },
  });

  const onError = (e: unknown) => notifications.show({ message: errorMessage(e), color: "red" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["pools"] });

  const addPool = useMutation({
    mutationFn: (v: { name: string; path: string }) => api.storage.addPool(v.name.trim(), v.path.trim()),
    onSuccess: () => {
      invalidate();
      setAdding(false);
      form.reset();
      notifications.show({ message: "Drive added", color: "teal" });
    },
    onError,
  });

  const removePool = useMutation({
    mutationFn: (name: string) => api.storage.removePool(name),
    onSuccess: () => {
      invalidate();
      notifications.show({ message: "Drive removed", color: "teal" });
    },
    onError,
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Storage</Title>
        <Button leftSection={<Plus size={16} />} onClick={() => setAdding(true)}>
          Add drive
        </Button>
      </Group>

      <Stack gap="xs">
        <Text fw={600}>Pools</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Kind</Table.Th>
                <Table.Th>Path</Table.Th>
                <Table.Th>Used</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th style={{ width: 200 }}>Usage</Table.Th>
                <Table.Th style={{ width: 48 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pools.data?.map((p) => {
                const ratio = p.totalBytes ? p.usedBytes / p.totalBytes : 0;
                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td>{p.kind}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {p.path}
                      </Text>
                    </Table.Td>
                    <Table.Td>{bytes(p.usedBytes)}</Table.Td>
                    <Table.Td>{bytes(p.totalBytes)}</Table.Td>
                    <Table.Td>
                      <Progress
                        value={ratio * 100}
                        size="sm"
                        color={ratio > 0.85 ? "red" : ratio > 0.65 ? "yellow" : "indigo"}
                      />
                    </Table.Td>
                    <Table.Td>
                      {removable(p.id) && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          loading={removePool.isPending && removePool.variables === p.name}
                          onClick={() => removePool.mutate(p.name)}
                          aria-label={`Remove ${p.name}`}
                        >
                          <Trash size={16} />
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Stack gap="xs">
        <Text fw={600}>Docker volumes</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Mountpoint</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {volumes.data?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No volumes.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {volumes.data?.map((v) => (
                <Table.Tr key={v.Name}>
                  <Table.Td>{v.Name}</Table.Td>
                  <Table.Td>{v.Driver}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {v.Mountpoint}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Modal opened={adding} onClose={() => setAdding(false)} title="Add drive" centered>
        <form onSubmit={form.onSubmit((v) => addPool.mutate(v))}>
          <Stack>
            <Text size="sm" c="dimmed">
              Mount the filesystem on the host first, then register its mountpoint here.
            </Text>
            <TextInput
              label="Name"
              placeholder="terramaster"
              leftSection={<HardDrive size={16} />}
              {...form.getInputProps("name")}
            />
            <TextInput label="Mount path" placeholder="/mnt/terramaster" {...form.getInputProps("path")} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={addPool.isPending}>
                Add
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
