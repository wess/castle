import { Anchor, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import * as api from "../../api/index.ts";

export const LxcDetail = () => {
  const { name = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["lxc", name],
    queryFn: () => api.lxc.inspect(name),
    enabled: Boolean(name),
  });

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/lxc" size="sm">
        <Group gap={4}>
          <ChevronLeft size={14} />
          LXC
        </Group>
      </Anchor>
      <Title order={2}>{name}</Title>
      <Card withBorder padding="md" radius="md">
        <Table>
          <Table.Tbody>
            {data &&
              Object.entries(data).map(([k, v]) => (
                <Table.Tr key={k}>
                  <Table.Td>{k}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{String(v)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};
