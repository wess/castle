import { Stack, Tabs, Title } from "@mantine/core";
import { MessageSquare, Package, Settings as SettingsIcon } from "lucide-react";
import { OllamaChat } from "./chat.tsx";
import { OllamaModels } from "./models.tsx";
import { OllamaSettings } from "./settings.tsx";

export const Ollama = () => {
  return (
    <Stack gap="md">
      <Title order={2}>Ollama</Title>
      <Tabs defaultValue="chat">
        <Tabs.List>
          <Tabs.Tab value="chat" leftSection={<MessageSquare size={14} />}>
            Chat
          </Tabs.Tab>
          <Tabs.Tab value="models" leftSection={<Package size={14} />}>
            Models
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<SettingsIcon size={14} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="chat" pt="md">
          <OllamaChat />
        </Tabs.Panel>
        <Tabs.Panel value="models" pt="md">
          <OllamaModels />
        </Tabs.Panel>
        <Tabs.Panel value="settings" pt="md">
          <OllamaSettings />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
