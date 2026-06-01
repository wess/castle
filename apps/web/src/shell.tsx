import { ActionIcon, AppShell, Avatar, Burger, Group, Menu, NavLink, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  Boxes,
  Castle,
  Database,
  Globe,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  Package,
  Plug,
  Server,
  Settings as SettingsIcon,
  Users as UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "./auth/context.tsx";
import { AppSwitcher } from "./components/appswitcher.tsx";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/ollama", label: "Ollama", icon: MessageSquare },
  { to: "/mcp", label: "MCP Server", icon: Plug },
  { to: "/containers", label: "Containers", icon: Boxes },
  { to: "/images", label: "Images", icon: ImageIcon },
  { to: "/lxc", label: "LXC", icon: Server },
  { to: "/networks", label: "Networks", icon: Network },
  { to: "/storage", label: "Storage", icon: HardDrive },
  { to: "/domains", label: "Domains", icon: Globe },
  { to: "/databases", label: "Databases", icon: Database },
  { to: "/users", label: "Users", icon: UsersIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const Shell = ({ children }: { children: ReactNode }) => {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const { user, authRequired, signOut } = useAuth();

  const initial = user?.email?.[0]?.toUpperCase() ?? "C";

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ThemeIcon variant="light" size="md" radius="md">
              <Castle size={18} />
            </ThemeIcon>
            <Group gap={6} align="baseline">
              <Text fw={600} size="lg">
                Castle
              </Text>
              <Text size="xs" c="dimmed" fw={500} ff="monospace">
                v{__CASTLE_VERSION__}
              </Text>
            </Group>
          </Group>

          <Group gap="xs">
            <AppSwitcher />

            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <Tooltip label={user?.email ?? "Account"}>
                  <ActionIcon variant="subtle" radius="xl">
                    <Avatar size={28} color="indigo" radius="xl">
                      {initial}
                    </Avatar>
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {user && (
                  <>
                    <Menu.Label>{user.email}</Menu.Label>
                    <Menu.Divider />
                  </>
                )}
                <Menu.Item leftSection={<SettingsIcon size={14} />} component={Link} to="/settings">
                  Settings
                </Menu.Item>
                {authRequired && (
                  <Menu.Item leftSection={<LogOut size={14} />} onClick={signOut}>
                    Sign out
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              component={RouterLink}
              to={item.to}
              label={item.label}
              leftSection={<Icon size={16} />}
              active={active}
              variant="light"
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
