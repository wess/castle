import { Card, Group, Progress, Text, ThemeIcon } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
};

export const Stat = ({ icon: Icon, label, value, sub, progress }: Props) => (
  <Card withBorder padding="md" radius="md">
    <Group justify="space-between" align="flex-start">
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
          {label}
        </Text>
        <Text size="xl" fw={600} mt={4}>
          {value}
        </Text>
        {sub && (
          <Text size="xs" c="dimmed" mt={2}>
            {sub}
          </Text>
        )}
      </div>
      <ThemeIcon variant="light" size="lg" radius="md">
        <Icon size={18} />
      </ThemeIcon>
    </Group>
    {progress !== undefined && (
      <Progress
        value={progress * 100}
        size="xs"
        mt="sm"
        color={progress > 0.85 ? "red" : progress > 0.65 ? "yellow" : "indigo"}
      />
    )}
  </Card>
);
