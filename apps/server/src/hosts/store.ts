import type { Db } from "../db/index.ts";

export type Location = {
  pattern: string;
  backend: string;
  websocket: boolean;
};

export type HostRoute = {
  hostname: string;
  backend: string;
  websocket: boolean;
  locations: Location[];
  created_at: number;
  updated_at: number;
};

const now = () => Math.floor(Date.now() / 1000);

const parseLocations = (raw: unknown): Location[] => {
  if (Array.isArray(raw)) return raw as Location[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Location[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalize = (row: any): HostRoute => ({
  hostname: row.hostname,
  backend: row.backend,
  websocket: row.websocket,
  locations: parseLocations(row.locations),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const list = async (db: Db): Promise<HostRoute[]> => {
  const rows = (await db`
    SELECT hostname, backend, websocket, locations, created_at, updated_at
    FROM host_routes
    ORDER BY hostname
  `) as any[];
  return rows.map(normalize);
};

export const get = async (db: Db, hostname: string): Promise<HostRoute | null> => {
  const rows = (await db`
    SELECT hostname, backend, websocket, locations, created_at, updated_at
    FROM host_routes
    WHERE hostname = ${hostname}
    LIMIT 1
  `) as any[];
  const row = rows[0];
  return row ? normalize(row) : null;
};

export const upsert = async (
  db: Db,
  input: { hostname: string; backend: string; websocket: boolean; locations?: Location[] },
): Promise<HostRoute> => {
  const t = now();
  const locations = JSON.stringify(input.locations ?? []);
  await db`
    INSERT INTO host_routes (hostname, backend, websocket, locations, created_at, updated_at)
    VALUES (${input.hostname}, ${input.backend}, ${input.websocket}, ${locations}::JSONB, ${t}, ${t})
    ON CONFLICT (hostname) DO UPDATE
      SET backend = EXCLUDED.backend,
          websocket = EXCLUDED.websocket,
          locations = EXCLUDED.locations,
          updated_at = EXCLUDED.updated_at
  `;
  const row = await get(db, input.hostname);
  return row!;
};

export const remove = async (db: Db, hostname: string): Promise<void> => {
  await db`DELETE FROM host_routes WHERE hostname = ${hostname}`;
};
