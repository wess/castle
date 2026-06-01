export type ServiceRole = "primary" | "db" | "cache" | "worker";

export type AppPort = {
  container: number;
  hostOffset?: number;
  protocol?: "tcp" | "udp";
  primary?: boolean;
};

export type AppVolume = {
  name: string;
  target: string;
};

export type AppEnv = Record<string, string>;

export type AppService = {
  key: string;
  role: ServiceRole;
  image: string;
  ports?: AppPort[];
  env?: AppEnv;
  volumes?: AppVolume[];
  cmd?: string[];
  dependsOn?: string[];
  generateSecrets?: string[];
  gpu?: boolean;
};

export type AppPromptField = {
  key: string;
  label: string;
  required?: boolean;
  default?: string;
  placeholder?: string;
  type?: "text" | "password" | "email";
};

export type AppTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  docs?: string;
  multi: boolean;
  services: AppService[];
  prompts?: AppPromptField[];
};

export type AppInstance = {
  appId: string;
  name: string;
  hostname: string;
  primaryPort: number;
  primaryUrl: string;
  containers: Array<{ id: string; name: string; service: string }>;
  createdAt: string;
  // Populated only on freshly-installed instances — the install flow returns
  // generated secrets so the caller can persist them where appropriate
  // (e.g. CASTLE_ADMIN_TOKEN into Castle's app_connections registry). Empty
  // when produced by listInstances().
  secrets?: Record<string, string>;
};

export type InstallRequest = {
  appId: string;
  name: string;
  inputs?: Record<string, string>;
};
