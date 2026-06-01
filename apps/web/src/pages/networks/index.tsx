import { Card, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import * as api from "../../api/index.ts";

export const Networks = () => {
  const { data } = useQuery({ queryKey: ["networks"], queryFn: api.networks.list, refetchInterval: 10_000 });

  return (
    <Stack gap="lg">
      <Title order={2}>Networks</Title>

      <Stack gap="xs">
        <Text fw={600}>Docker</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Subnet</Table.Th>
                <Table.Th>Attached</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.docker.map((n) => (
                <Table.Tr key={n.id}>
                  <Table.Td>{n.name}</Table.Td>
                  <Table.Td>{n.driver}</Table.Td>
                  <Table.Td>{n.subnet ?? "—"}</Table.Td>
                  <Table.Td>{n.attached}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Stack gap="xs">
        <Text fw={600}>Host bridges</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Driver</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.host.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={2}>
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No host bridges.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.host.map((n) => (
                <Table.Tr key={n.id}>
                  <Table.Td>{n.name}</Table.Td>
                  <Table.Td>{n.driver}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Stack>
  );
};
