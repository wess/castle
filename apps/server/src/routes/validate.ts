export const HOSTNAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;
export const BACKEND_RE = /^[a-z0-9.-]+:[0-9]+$/i;

export type Location = { pattern: string; backend: string; websocket: boolean };

type LocationInput = { pattern?: unknown; backend?: unknown; websocket?: unknown };

export type ParseLocationsResult = { ok: true; locations: Location[] } | { ok: false; error: string };

export const parseLocations = (raw: unknown): ParseLocationsResult => {
  if (raw === undefined) return { ok: true, locations: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "locations must be an array" };
  const out: Location[] = [];
  for (const item of raw as LocationInput[]) {
    const pattern = typeof item.pattern === "string" ? item.pattern.trim() : "";
    const backend = typeof item.backend === "string" ? item.backend.trim() : "";
    if (!pattern) return { ok: false, error: "location pattern required" };
    if (!BACKEND_RE.test(backend)) return { ok: false, error: `location backend invalid: ${backend}` };
    out.push({ pattern, backend, websocket: item.websocket !== false });
  }
  return { ok: true, locations: out };
};

export const ensureLocal = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) throw new Error("hostname required");
  return trimmed.endsWith(".local") ? trimmed : `${trimmed}.local`;
};
