// @ts-nocheck
import { ActionIcon, AppShell, Tooltip } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { ArrowLeftFromLine } from "lucide-react";

export const Layout = () => (
  <AppShell padding={0} style={{ height: "100vh" }}>
    <Tooltip label="Back to Castle" position="right" withinPortal>
      <ActionIcon
        component="a"
        href="/"
        variant="filled"
        color="indigo"
        radius="xl"
        size="md"
        style={{
          position: "fixed",
          bottom: 38,
          left: 10,
          zIndex: 1000,
        }}
      >
        <ArrowLeftFromLine size={14} />
      </ActionIcon>
    </Tooltip>
    <Outlet />
  </AppShell>
);
