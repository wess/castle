import { Anchor, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Cloud, ExternalLink, GitBranch, Package } from "lucide-react";
import * as api from "../api/index.ts";

const iconFor = (appId: string) => {
  if (appId === "tangle") return GitBranch;
  if (appId === "stohr") return Cloud;
  return Package;
};

const labelFor = (appId: string): string => {
  if (appId === "tangle") return "Tangle";
  if (appId === "stohr") return "Stohr";
  return appId;
};

/**
 * Dashboard tile row — one card per registered app connection. Clicking
 * routes through the app's OIDC login endpoint, which finalises SSO
 * silently when the user is already authenticated to Castle.
 */
export const QuickLaunch = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: api.connections.list,
    refetchInterval: 60_000,
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        Quick launch
      </Text>
      <Group gap="md" wrap="wrap">
        {data.map((c) => {
          const Icon = iconFor(c.appId);
          return (
            <Anchor
              key={c.id}
              href={`http://${c.hostname}/auth/sso/login`}
              target="_blank"
              rel="noreferrer"
              underline="never"
            >
              <Card withBorder padding="sm" radius="md" w={220}>
                <Group gap="sm" justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="indigo" radius="md">
                      <Icon size={16} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={500}>
                        {labelFor(c.appId)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {c.hostname}
                      </Text>
                    </div>
                  </Group>
                  <ExternalLink size={12} style={{ opacity: 0.4 }} />
                </Group>
              </Card>
            </Anchor>
          );
        })}
      </Group>
    </Stack>
  );
};
