import { Anchor, Card, Code, Group, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import * as api from "../../api/index.ts";
import { Logs } from "./logs.tsx";

export const ContainerDetail = () => {
  const { id = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["containers", id],
    queryFn: () => api.containers.inspect(id),
    enabled: Boolean(id),
  });

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/containers" size="sm">
        <Group gap={4}>
          <ChevronLeft size={14} />
          Containers
        </Group>
      </Anchor>
      <Title order={2}>{data?.Name?.replace(/^\//, "") ?? "—"}</Title>

      <Card withBorder padding="md" radius="md">
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>ID</Table.Td>
              <Table.Td>
                <Code>{data?.Id?.slice(0, 12)}</Code>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Image</Table.Td>
              <Table.Td>
                <Code>{data?.Config?.Image}</Code>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>State</Table.Td>
              <Table.Td>
                <Text size="sm">{data?.State?.Status}</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Started</Table.Td>
              <Table.Td>
                <Text size="sm">{data?.State?.StartedAt}</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Command</Table.Td>
              <Table.Td>
                <Code>{(data?.Config?.Cmd ?? []).join(" ") || "—"}</Code>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Logs id={id} />
    </Stack>
  );
};
