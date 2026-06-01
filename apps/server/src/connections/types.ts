export type AppConnection = {
  id: number;
  appId: "tangle" | "stohr";
  instance: string;
  hostname: string;
  token: string;
  managed: boolean;
  created_at: number;
};

export type AppConnectionInput = {
  appId: "tangle" | "stohr";
  instance: string;
  hostname: string;
  token: string;
  managed?: boolean;
};
