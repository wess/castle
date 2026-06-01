import {
  Box,
  Button,
  Card,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Castle } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.ts";
import { useAuth } from "../auth/context.tsx";

export const Login = () => {
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (v.length === 0 ? "required" : null),
      password: (v) => (v.length === 0 ? "required" : null),
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
            <Title order={2}>Castle</Title>
            <Text size="sm" c="dimmed">
              Sign in to manage this host
            </Text>
          </Stack>

          <Card withBorder padding="lg" radius="md">
            <form
              onSubmit={form.onSubmit(async (v) => {
                setSubmitting(true);
                setError(null);
                try {
                  await signIn(v.email, v.password);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setSubmitting(false);
                }
              })}
            >
              <Stack gap="md">
                <TextInput label="Email" autoComplete="username" {...form.getInputProps("email")} />
                <PasswordInput label="Password" autoComplete="current-password" {...form.getInputProps("password")} />
                {error && (
                  <Text size="sm" c="red">
                    {error}
                  </Text>
                )}
                <Group justify="flex-end">
                  <Button type="submit" loading={submitting} fullWidth>
                    Sign in
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
