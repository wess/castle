import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Divider,
  Group,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Globe, Pencil, Plus, RefreshCw, Trash, X } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.ts";
import * as api from "../api/index.ts";
import { useLiveQuery } from "../live/index.ts";

const ensureLocal = (n: string): string => {
  const t = n.trim().toLowerCase();
  return t.endsWith(".local") ? t : `${t}.local`;
};

type EditState = {
  hostname: string;
  backend: string;
  websocket: boolean;
  locations: api.routes.Location[];
};

export const Domains = () => {
  const qc = useQueryClient();
  const { data: aliasData } = useLiveQuery({ queryKey: ["domains"], queryFn: api.domains.list, topic: "domains" });
  const { data: routes } = useLiveQuery({ queryKey: ["routes"], queryFn: api.routes.list, topic: "routes" });
  const { data: sites } = useLiveQuery({
    queryKey: ["nginx-sites"],
    queryFn: api.routes.listSites,
    topic: "nginx-sites",
  });

  const byHost = new Map((routes ?? []).map((r) => [r.hostname, r]));
  const onlyAliases = (aliasData?.entries ?? []).filter((h) => !byHost.has(h));

  const form = useForm({
    initialValues: { name: "", backend: "", websocket: true },
    validate: {
      name: (v) => (!v.trim() ? "required" : null),
      backend: (v) =>
        v.trim() && !/^[a-z0-9.-]+:[0-9]+$/i.test(v.trim()) ? "must be host:port (or leave blank)" : null,
    },
  });

  const [editing, setEditing] = useState<EditState | null>(null);
  const [viewing, setViewing] = useState<{ name: string; raw: string } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["routes"] });
    qc.invalidateQueries({ queryKey: ["domains"] });
    qc.invalidateQueries({ queryKey: ["nginx-sites"] });
  };

  const handleResult = (label: string) => (res: { nginx?: boolean; mdns?: boolean; error?: string }) => {
    invalidate();
    const warn = res.nginx === false || res.mdns === false;
    notifications.show({
      message: warn ? `${label} (warning: ${res.error ?? "reload partial"})` : label,
      color: warn ? "yellow" : "teal",
    });
  };

  const onError = (e: unknown) => notifications.show({ message: errorMessage(e), color: "red" });

  const addAlias = useMutation({
    mutationFn: (n: string) => api.domains.add(n),
    onSuccess: (res) => {
      invalidate();
      notifications.show({
        message: res.reloaded === false ? `Added (mDNS warning: ${res.error ?? "unknown"})` : "Added",
        color: res.reloaded === false ? "yellow" : "teal",
      });
    },
    onError,
  });

  const addRoute = useMutation({
    mutationFn: (v: api.routes.RouteInput) => api.routes.create(v),
    onSuccess: handleResult("Route added"),
    onError,
  });

  const removeAlias = useMutation({
    mutationFn: (n: string) => api.domains.remove(n),
    onSuccess: (res) => {
      invalidate();
      notifications.show({
        message: res.reloaded === false ? `Removed (mDNS warning: ${res.error ?? "unknown"})` : "Removed",
        color: res.reloaded === false ? "yellow" : "teal",
      });
    },
    onError,
  });

  const removeRoute = useMutation({
    mutationFn: (n: string) =>
      api.routes.remove(n).then(async () => {
        await api.domains.remove(n).catch(() => {});
      }),
    onSuccess: () => {
      invalidate();
      notifications.show({ message: "Removed", color: "teal" });
    },
    onError,
  });

  const updateRoute = useMutation({
    mutationFn: (v: EditState) =>
      api.routes.update(v.hostname, { backend: v.backend, websocket: v.websocket, locations: v.locations }),
    onSuccess: (res) => {
      handleResult("Route updated")(res);
      setEditing(null);
    },
    onError,
  });

  const reloadMdns = useMutation({
    mutationFn: () => api.domains.reload(),
    onSuccess: (r) => {
      notifications.show({
        message: r.reloaded ? "Reloaded mDNS" : `Reload failed: ${r.error ?? "unknown"}`,
        color: r.reloaded ? "teal" : "red",
      });
    },
    onError,
  });

  const toggleSite = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      enabled ? api.routes.disableSite(name) : api.routes.enableSite(name),
    onSuccess: (_, vars) => {
      invalidate();
      notifications.show({ message: `${vars.enabled ? "Disabled" : "Enabled"} ${vars.name}`, color: "teal" });
    },
    onError,
  });

  const openView = async (name: string) => {
    try {
      const r = await api.routes.readSite(name);
      setViewing({ name: r.name, raw: r.raw });
    } catch (e) {
      onError(e);
    }
  };

  const updateLoc = (idx: number, patch: Partial<api.routes.Location>) => {
    setEditing((cur) => {
      if (!cur) return cur;
      const locs = [...cur.locations];
      locs[idx] = { ...locs[idx]!, ...patch };
      return { ...cur, locations: locs };
    });
  };

  return (
    <Stack gap="md" maw={960}>
      <Group justify="space-between">
        <Title order={2}>Local domains</Title>
        <Button
          variant="subtle"
          leftSection={<RefreshCw size={14} />}
          loading={reloadMdns.isPending}
          onClick={() => reloadMdns.mutate()}
        >
          Reload mDNS
        </Button>
      </Group>

      <Text size="sm" c="dimmed">
        Announce <code>.local</code> hostnames over mDNS. Pair with a backend like <code>127.0.0.1:3001</code> and
        Castle will generate an nginx vhost so traffic on port 80 reaches your service.
      </Text>

      <Card withBorder padding="md" radius="md">
        <form
          onSubmit={form.onSubmit((v) => {
            const hostname = ensureLocal(v.name);
            const backend = v.backend.trim();
            if (backend) {
              addRoute.mutate({ hostname, backend, websocket: v.websocket });
            } else {
              addAlias.mutate(hostname);
            }
            form.reset();
            form.setFieldValue("websocket", true);
          })}
        >
          <Stack gap="sm">
            <Group gap="sm" align="start">
              <TextInput
                label="Hostname"
                placeholder="git"
                description=".local appended automatically"
                style={{ flex: 1 }}
                {...form.getInputProps("name")}
              />
              <TextInput
                label="Backend (optional)"
                placeholder="127.0.0.1:3001"
                description="host:port — leave blank for mDNS only"
                style={{ flex: 1.4 }}
                {...form.getInputProps("backend")}
              />
            </Group>
            <Group justify="space-between">
              <Checkbox label="WebSocket upgrade" {...form.getInputProps("websocket", { type: "checkbox" })} />
              <Button type="submit" leftSection={<Plus size={16} />} loading={addAlias.isPending || addRoute.isPending}>
                Add
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder padding={0} radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Hostname</Table.Th>
              <Table.Th>Forwards to</Table.Th>
              <Table.Th>Paths</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(!aliasData || !routes) && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Loading…
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {aliasData?.entries.length === 0 && (routes ?? []).length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No domains yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {(routes ?? []).map((r) => (
              <Table.Tr key={r.hostname}>
                <Table.Td>
                  <Group gap="xs">
                    <Globe size={14} style={{ opacity: 0.6 }} />
                    <Anchor href={`http://${r.hostname}/`} target="_blank" rel="noreferrer">
                      {r.hostname}
                    </Anchor>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" ff="monospace">
                    {r.backend}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {r.locations.length > 0 ? (
                    <Badge size="xs" variant="default">
                      {r.locations.length + 1} paths
                    </Badge>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="subtle"
                        onClick={() =>
                          setEditing({
                            hostname: r.hostname,
                            backend: r.backend,
                            websocket: r.websocket,
                            locations: r.locations,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remove">
                      <ActionIcon variant="subtle" color="red" onClick={() => removeRoute.mutate(r.hostname)}>
                        <Trash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {onlyAliases.map((name) => (
              <Table.Tr key={name}>
                <Table.Td>
                  <Group gap="xs">
                    <Globe size={14} style={{ opacity: 0.6 }} />
                    <Anchor href={`http://${name}/`} target="_blank" rel="noreferrer">
                      {name}
                    </Anchor>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed" fs="italic">
                    mDNS only
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <Tooltip label="Remove">
                      <ActionIcon variant="subtle" color="red" onClick={() => removeAlias.mutate(name)}>
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

      {(sites ?? []).length > 0 && (
        <>
          <Title order={4} mt="md">
            Manual nginx sites
          </Title>
          <Text size="xs" c="dimmed">
            Configs hand-written in <code>/etc/nginx/sites-available/</code>. Toggle on/off or view their contents.
          </Text>
          <Card withBorder padding={0} radius="md">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File</Table.Th>
                  <Table.Th>server_name</Table.Th>
                  <Table.Th style={{ textAlign: "center" }}>Enabled</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sites?.map((s) => (
                  <Table.Tr key={s.name}>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {s.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="wrap">
                        {s.serverNames.length === 0 ? (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        ) : (
                          s.serverNames.map((n) => (
                            <Badge key={n} size="xs" variant="default">
                              {n}
                            </Badge>
                          ))
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "center" }}>
                      <Switch
                        checked={s.enabled}
                        onChange={() => toggleSite.mutate({ name: s.name, enabled: s.enabled })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="View config">
                          <ActionIcon variant="subtle" onClick={() => openView(s.name)}>
                            <Eye size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </>
      )}

      <Modal opened={editing !== null} onClose={() => setEditing(null)} title={editing?.hostname} size="lg" centered>
        {editing && (
          <Stack gap="md">
            <TextInput
              label="Default backend (location /)"
              placeholder="127.0.0.1:3001"
              value={editing.backend}
              onChange={(e) => setEditing({ ...editing, backend: e.currentTarget.value })}
            />
            <Checkbox
              label="WebSocket upgrade on default"
              checked={editing.websocket}
              onChange={(e) => setEditing({ ...editing, websocket: e.currentTarget.checked })}
            />
            <Divider label="Extra paths (advanced)" labelPosition="left" />
            <Text size="xs" c="dimmed">
              Define additional <code>location</code> blocks that match before the default. Useful when one hostname
              fronts multiple processes (e.g. Tangle's git smart-HTTP on a separate port).
            </Text>
            <Stack gap="xs">
              {editing.locations.map((loc, i) => (
                <Group key={i} gap="xs" align="end" wrap="nowrap">
                  <TextInput
                    label={i === 0 ? "Pattern" : undefined}
                    placeholder="~ ^/[^/]+/[^/]+\.git(?:/|$)"
                    value={loc.pattern}
                    onChange={(e) => updateLoc(i, { pattern: e.currentTarget.value })}
                    style={{ flex: 1.6 }}
                  />
                  <TextInput
                    label={i === 0 ? "Backend" : undefined}
                    placeholder="127.0.0.1:3000"
                    value={loc.backend}
                    onChange={(e) => updateLoc(i, { backend: e.currentTarget.value })}
                    style={{ flex: 1 }}
                  />
                  <Checkbox
                    label={i === 0 ? "WS" : undefined}
                    checked={loc.websocket}
                    onChange={(e) => updateLoc(i, { websocket: e.currentTarget.checked })}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setEditing({ ...editing, locations: editing.locations.filter((_, j) => j !== i) })}
                  >
                    <X size={14} />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                size="xs"
                variant="subtle"
                leftSection={<Plus size={14} />}
                onClick={() =>
                  setEditing({
                    ...editing,
                    locations: [...editing.locations, { pattern: "", backend: "", websocket: true }],
                  })
                }
              >
                Add path
              </Button>
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => updateRoute.mutate(editing)} loading={updateRoute.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={viewing !== null} onClose={() => setViewing(null)} title={viewing?.name} size="lg" centered>
        {viewing && (
          <Code block style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {viewing.raw}
          </Code>
        )}
      </Modal>
    </Stack>
  );
};
