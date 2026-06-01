import { Card, Progress, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import * as api from "../../api/index.ts";
import { bytes } from "../../format.ts";

export const Storage = () => {
  const pools = useQuery({ queryKey: ["pools"], queryFn: api.storage.pools, refetchInterval: 10_000 });
  const volumes = useQuery({ queryKey: ["volumes"], queryFn: api.storage.volumes, refetchInterval: 10_000 });

  return (
    <Stack gap="lg">
      <Title order={2}>Storage</Title>

      <Stack gap="xs">
        <Text fw={600}>Pools</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Kind</Table.Th>
                <Table.Th>Path</Table.Th>
                <Table.Th>Used</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th style={{ width: 200 }}>Usage</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pools.data?.map((p) => {
                const ratio = p.totalBytes ? p.usedBytes / p.totalBytes : 0;
                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td>{p.kind}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {p.path}
                      </Text>
                    </Table.Td>
                    <Table.Td>{bytes(p.usedBytes)}</Table.Td>
                    <Table.Td>{bytes(p.totalBytes)}</Table.Td>
                    <Table.Td>
                      <Progress
                        value={ratio * 100}
                        size="sm"
                        color={ratio > 0.85 ? "red" : ratio > 0.65 ? "yellow" : "indigo"}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Stack gap="xs">
        <Text fw={600}>Docker volumes</Text>
        <Card withBorder padding={0} radius="md">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Mountpoint</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {volumes.data?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No volumes.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {volumes.data?.map((v) => (
                <Table.Tr key={v.Name}>
                  <Table.Td>{v.Name}</Table.Td>
                  <Table.Td>{v.Driver}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {v.Mountpoint}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Stack>
  );
};
