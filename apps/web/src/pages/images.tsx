import { ActionIcon, Button, Card, Group, Modal, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.ts";
import * as api from "../api/index.ts";
import { bytes } from "../format.ts";

export const Images = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["images"], queryFn: api.images.list, refetchInterval: 10_000 });
  const [opened, { open, close }] = useDisclosure(false);
  const [ref, setRef] = useState("");

  const pull = useMutation({
    mutationFn: (r: string) => api.images.pull(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      notifications.show({ message: "Image pulled", color: "teal" });
      setRef("");
      close();
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const remove = useMutation({
    mutationFn: (r: string) => api.images.remove(r, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      notifications.show({ message: "Image removed", color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Images</Title>
        <Button leftSection={<Download size={16} />} onClick={open}>
          Pull image
        </Button>
      </Group>

      <Card withBorder padding={0} radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tag</Table.Th>
              <Table.Th>Size</Table.Th>
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
                    No images yet. Pull one to get started.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.flatMap((img) =>
              (img.RepoTags ?? ["<none>:<none>"]).map((tag) => (
                <Table.Tr key={`${img.Id}-${tag}`}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {tag}
                    </Text>
                  </Table.Td>
                  <Table.Td>{bytes(img.Size)}</Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <Tooltip label="Remove">
                        <ActionIcon variant="subtle" color="red" onClick={() => remove.mutate(tag)}>
                          <Trash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )),
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={close} title="Pull image" radius="md">
        <Stack gap="md">
          <TextInput
            label="Image reference"
            placeholder="nginx:latest"
            value={ref}
            onChange={(e) => setRef(e.currentTarget.value)}
            description="Examples: nginx:latest, ghcr.io/org/image:tag"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button loading={pull.isPending} onClick={() => ref && pull.mutate(ref)} disabled={!ref}>
              Pull
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
