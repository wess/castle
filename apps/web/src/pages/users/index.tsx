import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Divider,
  Group,
  Modal,
  PasswordInput,
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
import { KeyRound, Plus, RefreshCw, Trash, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";
import { ago } from "../../format.ts";
import { useLiveQuery } from "../../live/index.ts";
import { Connections } from "./connections.tsx";

type Result = { provisions: api.users.ProvisionResult[] };

const summarize = (r: Result, action: string): { message: string; color: string } => {
  const errors = r.provisions.filter((p) => !p.ok);
  if (errors.length === 0) {
    const ok = r.provisions.length;
    return { message: ok > 0 ? `${action} (+ ${ok} app${ok === 1 ? "" : "s"})` : action, color: "teal" };
  }
  return {
    message: `${action}, but ${errors.length} app${errors.length === 1 ? "" : "s"} failed: ${errors
      .map((e) => `${e.instance} (${e.error ?? "unknown"})`)
      .join("; ")}`,
    color: "yellow",
  };
};

export const Users = () => {
  const qc = useQueryClient();
  const { data: users, isLoading } = useLiveQuery({
    queryKey: ["users"],
    queryFn: api.users.list,
    topic: "users",
  });

  const [creating, setCreating] = useState(false);
  const [passwordFor, setPasswordFor] = useState<api.users.User | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });
  const onError = (e: unknown) => notifications.show({ message: errorMessage(e), color: "red" });

  const createForm = useForm({
    initialValues: { email: "", password: "", username: "", name: "" },
    validate: {
      email: (v) => (!v.trim() ? "required" : null),
      password: (v) => (v.length < 8 ? "min 8 characters" : null),
    },
  });

  const pwForm = useForm({
    initialValues: { password: "" },
    validate: { password: (v) => (v.length < 8 ? "min 8 characters" : null) },
  });

  const createMut = useMutation({
    mutationFn: api.users.create,
    onSuccess: (res) => {
      invalidate();
      notifications.show(summarize(res, `Created ${res.user.email}`));
      setCreating(false);
      createForm.reset();
    },
    onError,
  });

  const pwMut = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => api.users.setPassword(id, password),
    onSuccess: (res) => {
      invalidate();
      notifications.show(summarize(res, `Password updated for ${res.user.email}`));
      setPasswordFor(null);
      pwForm.reset();
    },
    onError,
  });

  const syncMut = useMutation({
    mutationFn: (id: number) => api.users.sync(id),
    onSuccess: (res) => {
      invalidate();
      notifications.show(summarize(res, `Synced ${res.user.email}`));
    },
    onError,
  });

  const delMut = useMutation({
    mutationFn: api.users.remove,
    onSuccess: () => {
      invalidate();
      notifications.show({ message: "Deleted", color: "teal" });
    },
    onError,
  });

  return (
    <Stack gap="md" maw={960}>
      <Group justify="space-between">
        <Title order={2}>Users</Title>
        <Button leftSection={<Plus size={16} />} onClick={() => setCreating(true)}>
          Add user
        </Button>
      </Group>

      <Text size="sm" c="dimmed">
        Castle accounts are propagated to user-aware apps you've installed (Tangle, Stohr). New users are back-filled on
        next install; existing instances are provisioned at create time.
      </Text>

      <Card withBorder padding={0} radius="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Apps</Table.Th>
              <Table.Th>Created</Table.Th>
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
            {users?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No users yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {users?.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>
                  <Group gap="xs">
                    <UserIcon size={14} style={{ opacity: 0.6 }} />
                    <Text size="sm">{u.email}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Code>{u.username}</Code>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {u.provisions.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    ) : (
                      u.provisions.map((p) => (
                        <Tooltip key={`${p.appId}/${p.instance}`} label={p.error ?? "ok"}>
                          <Badge size="xs" color={p.status === "ok" ? "teal" : "red"} variant="light">
                            {p.instance}
                          </Badge>
                        </Tooltip>
                      ))
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {ago(u.created_at * 1000)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <Tooltip label="Re-sync to apps">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => syncMut.mutate(u.id)}
                        loading={syncMut.isPending && syncMut.variables === u.id}
                      >
                        <RefreshCw size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Change password">
                      <ActionIcon variant="subtle" onClick={() => setPasswordFor(u)}>
                        <KeyRound size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          if (confirm(`Delete ${u.email}? This also removes them from connected apps.`)) {
                            delMut.mutate(u.id);
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

      <Divider my="md" />
      <Connections />

      <Modal opened={creating} onClose={() => setCreating(false)} title="Add user" centered>
        <form
          onSubmit={createForm.onSubmit((v) =>
            createMut.mutate({
              email: v.email.trim(),
              password: v.password,
              username: v.username.trim() || undefined,
              name: v.name.trim() || undefined,
            }),
          )}
        >
          <Stack gap="sm">
            <TextInput label="Email" placeholder="ada@example.com" {...createForm.getInputProps("email")} />
            <PasswordInput label="Password" {...createForm.getInputProps("password")} />
            <TextInput
              label="Username"
              placeholder="optional — derived from email"
              {...createForm.getInputProps("username")}
            />
            <TextInput
              label="Display name"
              placeholder="optional — derived from email"
              {...createForm.getInputProps("name")}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={passwordFor !== null} onClose={() => setPasswordFor(null)} title={passwordFor?.email} centered>
        <form
          onSubmit={pwForm.onSubmit((v) => {
            if (!passwordFor) return;
            pwMut.mutate({ id: passwordFor.id, password: v.password });
          })}
        >
          <Stack gap="sm">
            <PasswordInput label="New password" {...pwForm.getInputProps("password")} />
            <Text size="xs" c="dimmed">
              The new password is also pushed to every connected app instance.
            </Text>
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setPasswordFor(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={pwMut.isPending}>
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};
