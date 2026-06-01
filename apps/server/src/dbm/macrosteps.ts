// Macros are recorded UI step sequences (query / navigate / switchdb), stored
// as a JSON blob in dbm_macros.steps. The web client records and replays steps;
// there is no server-side SQL representation. These helpers keep the stored
// shape and the wire shape in agreement.

export const serializeSteps = (steps: unknown): string => JSON.stringify(Array.isArray(steps) ? steps : []);

export const parseSteps = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
