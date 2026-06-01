import { Card, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "../api/client.ts";
import * as api from "../api/index.ts";
import { useAuth } from "../auth/context.tsx";

export const Settings = () => {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.settings.read });

  const save = useMutation({
    mutationFn: (patch: Partial<api.settings.Settings>) => api.settings.update(patch),
    onSuccess: async (next) => {
      qc.setQueryData(["settings"], next);
      await refresh();
      notifications.show({ message: "Settings saved", color: "teal" });
    },
    onError: (e) => notifications.show({ title: "Error", message: errorMessage(e), color: "red" }),
  });

  const authRequired = data?.auth_required ?? true;

  return (
    <Stack gap="md" maw={640}>
      <Title order={2}>Settings</Title>

      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2}>
              <Text fw={600}>Require authentication</Text>
              <Text size="sm" c="dimmed">
                When off, anyone reaching this server is signed in as the existing admin user. Safe only behind a
                trusted LAN.
              </Text>
            </Stack>
            <Switch
              checked={authRequired}
              disabled={isLoading || save.isPending}
              onChange={(e) => save.mutate({ auth_required: e.currentTarget.checked })}
            />
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};
