import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Cloud,
  ExternalLink,
  FileText,
  Film,
  GitBranch,
  House,
  Key,
  type LucideIcon,
  Network,
  Package,
  Shield,
  Sparkles,
  Trash,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "git-branch": GitBranch,
  cloud: Cloud,
  film: Film,
  key: Key,
  activity: Activity,
  house: House,
  shield: Shield,
  workflow: Workflow,
  "file-text": FileText,
  network: Network,
};

const iconOf = (name: string): LucideIcon => ICONS[name] ?? Package;

export const Apps = () => {
  const qc = useQueryClient();
  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: api.apps.list });
  const { data: instances } = useQuery({
    queryKey: ["apps", "installed"],
    queryFn: api.apps.installed,
    refetchInterval: 5_000,
  });

  const [picked, setPicked] = useState<api.apps.AppTemplate | null>(null);
  const [name, setName] = useState("");

  const installMut = useMutation({
    mutationFn: () => api.apps.install({ appId: picked!.id, name }),
    onSuccess: (res) => {
      notifications.show({
        title: `Installed ${picked?.name}`,
        message: `Reachable at ${res.instance.primaryUrl}`,
        color: "teal",
      });
      qc.invalidateQueries({ queryKey: ["apps", "installed"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      setPicked(null);
      setName("");
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const uninstallMut = useMutation({
    mutationFn: (n: string) => api.apps.uninstall(n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apps", "installed"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      notifications.show({ message: "Uninstalled", color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Apps</Title>
      </Group>

      {instances && instances.length > 0 && (
        <Card withBorder padding={0} radius="md">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>App</Table.Th>
                <Table.Th>URL</Table.Th>
                <Table.Th>Services</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {instances.map((inst) => (
                <Table.Tr key={inst.name}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {inst.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{inst.appId}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {inst.primaryPort ? (
                      <Anchor href={inst.primaryUrl} target="_blank" size="sm">
                        {inst.hostname}:{inst.primaryPort} <ExternalLink size={12} />
                      </Anchor>
                    ) : (
                      <Text size="sm" c="dimmed">
                        starting…
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {inst.containers.map((c) => c.service).join(", ")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <Tooltip label="Uninstall">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => uninstallMut.mutate(inst.name)}
                          loading={uninstallMut.isPending}
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
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {apps?.map((tpl) => {
          const Icon = iconOf(tpl.icon);
          return (
            <Card key={tpl.id} withBorder padding="md" radius="md">
              <Stack gap="sm" h="100%">
                <Group gap="sm" align="flex-start">
                  <ThemeIcon size="lg" variant="light" radius="md">
                    <Icon size={20} />
                  </ThemeIcon>
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Text fw={600}>{tpl.name}</Text>
                      <Badge size="xs" variant="default">
                        {tpl.category}
                      </Badge>
                      {tpl.multi && (
                        <Badge size="xs" variant="default" color="grape">
                          multi
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Group>
                <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                  {tpl.description}
                </Text>
                <Group justify="space-between">
                  {tpl.docs ? (
                    <Anchor href={tpl.docs} target="_blank" size="xs" c="dimmed">
                      docs
                    </Anchor>
                  ) : (
                    <span />
                  )}
                  <Button size="xs" onClick={() => setPicked(tpl)}>
                    Install
                  </Button>
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={picked !== null}
        onClose={() => setPicked(null)}
        title={picked ? `Install ${picked.name}` : ""}
        centered
      >
        {picked && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {picked.description}
            </Text>
            <TextInput
              label="Instance name"
              description="Maps to <name>.local. Lowercase, letters/numbers/dashes."
              placeholder="my-instance"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              autoFocus
            />
            {picked.multi && (
              <Text size="xs" c="dimmed">
                This app runs multiple containers (e.g. database + app). They'll all be created with the prefix{" "}
                <code>{name || "<name>"}</code>.
              </Text>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPicked(null)}>
                Cancel
              </Button>
              <Button onClick={() => installMut.mutate()} loading={installMut.isPending} disabled={!name}>
                Install
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
