import { Anchor, Button, Card, Group, Select, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";

type FormValues = {
  name: string;
  distro: string;
  release: string;
  arch: string;
};

export const CreateLxc = () => {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    initialValues: { name: "", distro: "debian", release: "bookworm", arch: "amd64" },
    validate: { name: (v) => (!v ? "required" : null) },
  });

  const create = useMutation({
    mutationFn: (v: FormValues) => api.lxc.create(v),
    onSuccess: () => {
      notifications.show({ message: "LXC created", color: "teal" });
      navigate("/lxc");
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  return (
    <Stack gap="md" maw={520}>
      <Anchor component={Link} to="/lxc" size="sm">
        <Group gap={4}>
          <ChevronLeft size={14} />
          LXC
        </Group>
      </Anchor>
      <Title order={2}>New LXC container</Title>

      <Card withBorder padding="lg" radius="md">
        <form onSubmit={form.onSubmit((v) => create.mutate(v))}>
          <Stack gap="md">
            <TextInput label="Name" placeholder="myct" {...form.getInputProps("name")} />
            <Select
              label="Distro"
              data={["debian", "ubuntu", "alpine", "fedora", "centos", "rockylinux"]}
              {...form.getInputProps("distro")}
            />
            <TextInput label="Release" placeholder="bookworm" {...form.getInputProps("release")} />
            <Select label="Arch" data={["amd64", "arm64", "armhf"]} {...form.getInputProps("arch")} />
            <Group justify="flex-end">
              <Button variant="subtle" component={Link} to="/lxc">
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
