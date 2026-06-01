import { createClient, models } from "@castle/ollama";
import { settings } from "../db/index.ts";
import { app } from "../state.ts";

export type PullStatus = "running" | "success" | "error" | "cancelled";

export type PullJob = {
  model: string;
  status: PullStatus;
  step: string;
  total: number;
  completed: number;
  startedAt: number;
  endedAt: number | null;
  error: string | null;
};

type InternalJob = PullJob & {
  abort: AbortController;
};

const jobs = new Map<string, InternalJob>();
const KEEP_FINISHED_MS = 60 * 60 * 1000;

const now = () => Date.now();

const sanitize = (j: InternalJob): PullJob => {
  const { abort, ...rest } = j;
  return rest;
};

const sweep = () => {
  const cutoff = now() - KEEP_FINISHED_MS;
  for (const [name, j] of jobs) {
    if (j.endedAt && j.endedAt < cutoff) jobs.delete(name);
  }
};

const ollamaClient = async () => {
  const [url, apiKey] = await Promise.all([
    settings.get(app().db, "ollama_url"),
    settings.get(app().db, "ollama_api_key"),
  ]);
  return createClient(url, { apiKey: apiKey || undefined });
};

const runPump = async (model: string, job: InternalJob): Promise<void> => {
  try {
    const client = await ollamaClient();
    const stream = await models.pull(client, model);
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      if (job.abort.signal.aborted) {
        await reader.cancel().catch(() => {});
        job.status = "cancelled";
        job.endedAt = now();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
        if (!line) continue;
        try {
          const evt = JSON.parse(line) as {
            status?: string;
            total?: number;
            completed?: number;
            error?: string;
          };
          if (evt.error) {
            job.error = evt.error;
            job.status = "error";
            job.endedAt = now();
            await reader.cancel().catch(() => {});
            return;
          }
          if (evt.status) job.step = evt.status;
          if (evt.status === "success") {
            job.status = "success";
            job.endedAt = now();
          }
          if (typeof evt.total === "number") job.total = evt.total;
          if (typeof evt.completed === "number") job.completed = evt.completed;
        } catch {
          // non-JSON line, skip
        }
      }
    }
    if (job.status === "running") {
      // stream ended without an explicit success event
      job.status = "success";
      job.endedAt = now();
    }
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    job.status = "error";
    job.endedAt = now();
  } finally {
    sweep();
  }
};

export const start = (model: string): { started: boolean; job: PullJob } => {
  sweep();
  const existing = jobs.get(model);
  if (existing && existing.status === "running") {
    return { started: false, job: sanitize(existing) };
  }
  const job: InternalJob = {
    model,
    status: "running",
    step: "starting",
    total: 0,
    completed: 0,
    startedAt: now(),
    endedAt: null,
    error: null,
    abort: new AbortController(),
  };
  jobs.set(model, job);
  runPump(model, job).catch((err) => {
    job.error = err instanceof Error ? err.message : String(err);
    job.status = "error";
    job.endedAt = now();
  });
  return { started: true, job: sanitize(job) };
};

export const list = (): PullJob[] => {
  sweep();
  return [...jobs.values()].map(sanitize).sort((a, b) => b.startedAt - a.startedAt);
};

export const get = (model: string): PullJob | null => {
  const j = jobs.get(model);
  return j ? sanitize(j) : null;
};

export const cancel = (model: string): boolean => {
  const j = jobs.get(model);
  if (!j) return false;
  if (j.status !== "running") return false;
  j.abort.abort();
  return true;
};
