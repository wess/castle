import { createClient, type DockerClient } from "@castle/docker";
import { config } from "./config.ts";
import { connect, type Db, migrate } from "./db/index.ts";

export type AppState = {
  docker: DockerClient;
  db: Db;
  secret: string;
};

let state: AppState | null = null;

export const init = async (): Promise<AppState> => {
  if (state) return state;
  const cfg = config();
  const db = connect(cfg.databaseUrl);
  await migrate(db);
  state = {
    docker: createClient({ socket: cfg.dockerSocket }),
    db,
    secret: cfg.secret,
  };
  return state;
};

export const app = (): AppState => {
  if (!state) throw new Error("state not initialised — call init() first");
  return state;
};
