import { Anchor, Button, Card, Group, Select, Stack, Textarea, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";

type FormValues = {
  name: string;
  image: string;
  ports: string;
  env: string;
  restart: "no" | "always" | "unless-stopped" | "on-failure";
};

const parsePorts = (text: string): { host: number; container: number }[] =>
  text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [host, container] = line.split(":").map(Number);
      return { host: host ?? 0, container: container ?? host ?? 0 };
    })
    .filter((p) => p.host && p.container);

const parseEnv = (text: string): string[] =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export const CreateContainer = () => {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    initialValues: { name: "", image: "", ports: "", env: "", restart: "unless-stopped" },
    validate: {
      name: (v) => (!v ? "required" : null),
      image: (v) => (!v ? "required" : null),
    },
  });

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api.containers.create({
        name: v.name,
        image: v.image,
        ports: parsePorts(v.ports),
        env: parseEnv(v.env),
        restart: v.restart,
      }),
    onSuccess: () => {
      notifications.show({ message: "Container created", color: "teal" });
      navigate("/containers");
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  return (
    <Stack gap="md" maw={640}>
      <Anchor component={Link} to="/containers" size="sm">
        <Group gap={4}>
          <ChevronLeft size={14} />
          Containers
        </Group>
      </Anchor>
      <Title order={2}>New container</Title>

      <Card withBorder padding="lg" radius="md">
        <form onSubmit={form.onSubmit((v) => create.mutate(v))}>
          <Stack gap="md">
            <TextInput label="Name" placeholder="my-service" {...form.getInputProps("name")} />
            <TextInput
              label="Image"
              placeholder="nginx:latest"
              description="Must be already pulled, or pullable from configured registries"
              {...form.getInputProps("image")}
            />
            <Textarea
              label="Ports"
              placeholder="8080:80"
              description="One mapping per line, host:container"
              autosize
              minRows={2}
              {...form.getInputProps("ports")}
            />
            <Textarea
              label="Environment"
              placeholder="KEY=value"
              description="One variable per line"
              autosize
              minRows={2}
              {...form.getInputProps("env")}
            />
            <Select
              label="Restart policy"
              data={["no", "always", "unless-stopped", "on-failure"]}
              {...form.getInputProps("restart")}
            />
            <Group justify="flex-end">
              <Button variant="subtle" component={Link} to="/containers">
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
