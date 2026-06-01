import { Card, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
import * as api from "../api/index.ts";
import { QuickLaunch } from "../components/quicklaunch.tsx";
import { Stat } from "../components/stat.tsx";
import { bytes, duration, percent } from "../format.ts";

export const Dashboard = () => {
  const stats = useQuery({ queryKey: ["host"], queryFn: api.host.host, refetchInterval: 5_000 });
  const engine = useQuery({ queryKey: ["engine"], queryFn: api.host.engine, refetchInterval: 15_000 });
  const containers = useQuery({ queryKey: ["containers"], queryFn: api.containers.list, refetchInterval: 5_000 });
  const lxc = useQuery({ queryKey: ["lxc"], queryFn: api.lxc.list, refetchInterval: 5_000 });

  const h = stats.data;
  const runningCt = containers.data?.filter((c) => c.state === "running").length ?? 0;
  const totalCt = containers.data?.length ?? 0;
  const runningLx = lxc.data?.filter((c) => c.state === "running").length ?? 0;
  const totalLx = lxc.data?.length ?? 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>{h?.hostname ?? "Castle"}</Title>
          <Text c="dimmed" size="sm">
            Kernel {h?.kernel ?? "—"} · up {h ? duration(h.uptime) : "—"}
          </Text>
        </div>
      </Group>

      <QuickLaunch />

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Stat
            icon={Cpu}
            label="CPU"
            value={h ? percent(h.cpu.usage) : "—"}
            sub={h ? `${h.cpu.cores} cores · load ${h.cpu.loadAvg.join(" ")}` : undefined}
            progress={h?.cpu.usage}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Stat
            icon={MemoryStick}
            label="Memory"
            value={h ? bytes(h.memory.usedBytes) : "—"}
            sub={h ? `of ${bytes(h.memory.totalBytes)}` : undefined}
            progress={h ? h.memory.usedBytes / h.memory.totalBytes : undefined}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Stat
            icon={HardDrive}
            label="Root disk"
            value={h ? bytes(h.disk.usedBytes) : "—"}
            sub={h ? `of ${bytes(h.disk.totalBytes)}` : undefined}
            progress={h?.disk.totalBytes ? h.disk.usedBytes / h.disk.totalBytes : undefined}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Stat
            icon={Server}
            label="Docker engine"
            value={engine.data?.docker.online ? "Online" : "Offline"}
            sub={engine.data?.docker.ServerVersion ? `v${engine.data.docker.ServerVersion}` : undefined}
          />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between">
              <Group gap="sm">
                <Boxes size={18} />
                <Text fw={600}>Containers</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {runningCt} running · {totalCt} total
              </Text>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between">
              <Group gap="sm">
                <Server size={18} />
                <Text fw={600}>LXC</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {runningLx} running · {totalLx} total
              </Text>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
