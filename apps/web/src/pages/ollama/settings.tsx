import { Anchor, Button, Group, PasswordInput, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { errorMessage } from "../../api/client.ts";
import * as api from "../../api/index.ts";

const CLOUD_URL = "https://ollama.com";
const LOCAL_URL = "http://localhost:11434";

const detectMode = (url: string): "local" | "cloud" | "custom" => {
  if (url === LOCAL_URL) return "local";
  if (url === CLOUD_URL) return "cloud";
  return "custom";
};

export const OllamaSettings = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ollama", "settings"], queryFn: api.ollama.settings });
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<"local" | "cloud" | "custom">("local");

  useEffect(() => {
    if (data) {
      setUrl(data.url);
      setApiKey(data.apiKey);
      setMode(detectMode(data.url));
    }
  }, [data]);

  const switchMode = (m: string) => {
    const next = m as "local" | "cloud" | "custom";
    setMode(next);
    if (next === "local") setUrl(LOCAL_URL);
    else if (next === "cloud") setUrl(CLOUD_URL);
  };

  const save = useMutation({
    mutationFn: () => api.ollama.saveSettings({ url, apiKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ollama"] });
      notifications.show({ message: "Saved", color: "teal" });
    },
    onError: (e) => notifications.show({ message: errorMessage(e), color: "red" }),
  });

  return (
    <Stack gap="md" maw={520}>
      <SegmentedControl
        value={mode}
        onChange={switchMode}
        data={[
          { value: "local", label: "Local" },
          { value: "cloud", label: "Ollama Cloud" },
          { value: "custom", label: "Custom" },
        ]}
      />

      <TextInput
        label="URL"
        description={
          mode === "cloud"
            ? "Ollama Cloud endpoint."
            : mode === "local"
              ? "HTTP endpoint where Ollama is listening on this host or LAN."
              : "Any HTTP(S) endpoint that speaks the Ollama API."
        }
        value={url}
        onChange={(e) => {
          setUrl(e.currentTarget.value);
          setMode(detectMode(e.currentTarget.value));
        }}
      />

      <PasswordInput
        label="API key"
        description={
          mode === "cloud" ? "Required for Ollama Cloud." : "Optional. Set if the endpoint requires Bearer auth."
        }
        placeholder={mode === "cloud" ? "ollama-..." : "(leave blank for local)"}
        value={apiKey}
        onChange={(e) => setApiKey(e.currentTarget.value)}
      />

      {mode === "cloud" && (
        <Text size="xs" c="dimmed">
          Get a key at{" "}
          <Anchor href="https://ollama.com/settings/keys" target="_blank" size="xs">
            ollama.com/settings/keys
          </Anchor>
          .
        </Text>
      )}

      {mode === "local" && (
        <Text size="xs" c="dimmed">
          If Ollama runs as a Castle-managed app, the URL is{" "}
          <code>http://&lt;instance&gt;.local:&lt;mapped-port&gt;</code> — check the Apps page for the exact URL.
        </Text>
      )}

      <Group>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save
        </Button>
      </Group>
    </Stack>
  );
};
