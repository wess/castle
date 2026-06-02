import { ActionIcon, Group, Menu, Text, Tooltip } from "@mantine/core";
import { ExternalLink, Grid3X3 } from "lucide-react";
import * as api from "../api/index.ts";
import { useLiveQuery } from "../live/index.ts";

const labelFor = (appId: string): string => {
  if (appId === "tangle") return "Tangle";
  if (appId === "stohr") return "Stohr";
  return appId;
};

/**
 * Header dropdown listing every registered app connection. Clicking opens
 * the app's OIDC login URL in a new tab — the relying party redirects to
 * Castle, which (because the admin is already signed in here) skips the
 * password prompt and finalises the SSO handshake.
 */
export const AppSwitcher = () => {
  const { data } = useLiveQuery({
    queryKey: ["connections"],
    queryFn: api.connections.list,
    topic: "connections",
  });

  const items = (data ?? []).filter((c) => c.hostname);

  return (
    <Menu position="bottom-end" withArrow shadow="md">
      <Menu.Target>
        <Tooltip label="Open another app">
          <ActionIcon variant="subtle" radius="xl">
            <Grid3X3 size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Apps</Menu.Label>
        {items.length === 0 && (
          <Menu.Item disabled>
            <Text size="xs" c="dimmed">
              No connected apps yet
            </Text>
          </Menu.Item>
        )}
        {items.map((c) => (
          <Menu.Item
            key={c.id}
            component="a"
            href={`http://${c.hostname}/auth/sso/login`}
            target="_blank"
            rel="noreferrer"
            rightSection={<ExternalLink size={12} style={{ opacity: 0.5 }} />}
          >
            <Group gap="xs">
              <Text size="sm">{labelFor(c.appId)}</Text>
              <Text size="xs" c="dimmed">
                {c.instance}
              </Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
