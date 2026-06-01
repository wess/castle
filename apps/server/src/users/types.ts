export type User = {
  id: number;
  email: string;
  username: string;
  name: string;
  created_at: number;
};

export type CreateUserInput = {
  email: string;
  password: string;
  username?: string;
  name?: string;
};

export type ProvisionRecord = {
  user_id: number;
  app_id: string;
  instance: string;
  status: "ok" | "error";
  error: string | null;
  provisioned_at: number;
};
