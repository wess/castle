import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  PasswordInput,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";

const endpointUrl = (path: string): string => {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};

const claudeConfig = (endpoint: string, token: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        castle: {
          transport: "http",
          url: endpoint,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );

export const Mcp = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["mcp", "info"], queryFn: api.mcp.info });

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) => api.mcp.setEnabled(enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "info"] });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const regenMut = useMutation({
    mutationFn: () => api.mcp.regenerate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "info"] });
      notifications.show({ message: "Token regenerated", color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  const endpoint = endpointUrl(data?.endpoint ?? "/api/mcp");
  const enabled = data?.enabled ?? false;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>MCP Server</Title>
        <Switch
          label={enabled ? "Enabled" : "Disabled"}
          checked={enabled}
          onChange={(e) => toggleMut.mutate(e.currentTarget.checked)}
        />
      </Group>

      <Text size="sm" c="dimmed">
        Castle's MCP server exposes host operations as tools so AI agents (Claude Desktop, Cline, etc.) can
        list/start/stop containers, install apps, read logs, and more.
      </Text>

      <Card withBorder padding="md" radius="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Endpoint
            </Text>
            <CopyButton value={endpoint}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied" : "Copy"}>
                  <ActionIcon variant="subtle" onClick={copy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          <Code>{endpoint}</Code>

          <Group justify="space-between" mt="sm">
            <Text fw={600} size="sm">
              Bearer token
            </Text>
            <Group gap={4}>
              <Tooltip label="Regenerate">
                <ActionIcon variant="subtle" onClick={() => regenMut.mutate()} loading={regenMut.isPending}>
                  <RefreshCw size={14} />
                </ActionIcon>
              </Tooltip>
              <CopyButton value={data?.token ?? ""}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied" : "Copy"}>
                    <ActionIcon variant="subtle" onClick={copy} disabled={!data?.token}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Group>
          <PasswordInput value={data?.token ?? ""} readOnly />
          {!enabled && (
            <Text size="xs" c="dimmed">
              Enable the server to issue/regenerate a token. Disabled servers return 503.
            </Text>
          )}
        </Stack>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Claude Desktop / Cline config
          </Text>
          <Text size="xs" c="dimmed">
            Drop this into your client's MCP server list. The transport name may differ per client (some use{" "}
            <code>streamableHttp</code>).
          </Text>
          <Group justify="flex-end">
            <CopyButton value={data ? claudeConfig(endpoint, data.token) : ""}>
              {({ copied, copy }) => (
                <Button
                  size="xs"
                  variant="default"
                  leftSection={copied ? <Check size={12} /> : <Copy size={12} />}
                  onClick={copy}
                >
                  {copied ? "Copied" : "Copy config"}
                </Button>
              )}
            </CopyButton>
          </Group>
          <Code block style={{ whiteSpace: "pre-wrap" }}>
            {data ? claudeConfig(endpoint, data.token) : ""}
          </Code>
        </Stack>
      </Card>

      <Card withBorder padding={0} radius="md">
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600} size="sm">
            Tools
          </Text>
          <Badge variant="default">{data?.tools.length ?? 0}</Badge>
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {data?.tools.map((t) => (
              <Table.Tr key={t.name}>
                <Table.Td>
                  <Code>{t.name}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {t.description}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Anchor href="https://modelcontextprotocol.io" target="_blank" size="xs" c="dimmed">
        Learn more about the Model Context Protocol →
      </Anchor>
    </Stack>
  );
};
