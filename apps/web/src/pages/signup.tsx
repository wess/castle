import { Box, Button, Card, Center, Group, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Castle } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.ts";
import { useAuth } from "../auth/context.tsx";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export const Signup = () => {
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { username: "", email: "", password: "", name: "" },
    validate: {
      username: (v) =>
        USERNAME_RE.test(v.trim().toLowerCase()) ? null : "3-32 chars: lowercase letters, digits, underscore",
      email: (v) => (v.length === 0 || /.+@.+\..+/.test(v) ? null : "invalid email"),
      password: (v) => (v.length >= 8 ? null : "at least 8 characters"),
    },
  });

  return (
    <Center mih="100vh" p="lg">
      <Box maw={400} w="100%">
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <ThemeIcon size={48} variant="light" radius="md">
              <Castle size={28} />
            </ThemeIcon>
            <Title order={2}>Welcome to Castle</Title>
            <Text size="sm" c="dimmed">
              Create the owner account for this host
            </Text>
          </Stack>

          <Card withBorder padding="lg" radius="md">
            <form
              onSubmit={form.onSubmit(async (v) => {
                setSubmitting(true);
                setError(null);
                try {
                  await signUp({
                    username: v.username.trim().toLowerCase(),
                    password: v.password,
                    email: v.email.trim() || undefined,
                    name: v.name.trim() || undefined,
                  });
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <Stack gap="md">
                <TextInput label="Username" autoComplete="username" {...form.getInputProps("username")} />
                <TextInput
                  label="Email"
                  description="Optional on a private network"
                  autoComplete="email"
                  {...form.getInputProps("email")}
                />
                <TextInput label="Display name" description="Optional" {...form.getInputProps("name")} />
                <PasswordInput label="Password" autoComplete="new-password" {...form.getInputProps("password")} />
                {error && (
                  <Text size="sm" c="red">
                    {error}
                  </Text>
                )}
                <Group justify="flex-end">
                  <Button type="submit" loading={submitting} fullWidth>
                    Create account
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Stack>
      </Box>
    </Center>
  );
};
