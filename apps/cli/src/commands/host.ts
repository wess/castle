import { command } from "@atlas/cli";
import type { HostStats } from "@castle/core";
import { request } from "../client.ts";
import { bytes } from "../format.ts";

export const host = command("host", {
  description: "Show host stats",
  run: async () => {
    const h = await request<HostStats>("GET", "/host");
    const lines = [
      `hostname  ${h.hostname}`,
      `kernel    ${h.kernel}`,
      `uptime    ${Math.floor(h.uptime / 3600)}h`,
      `cpu       ${h.cpu.cores} cores · ${h.cpu.model || "—"}`,
      `load      ${h.cpu.loadAvg.join(" ")}`,
      `memory    ${bytes(h.memory.usedBytes)} / ${bytes(h.memory.totalBytes)}`,
      `disk      ${bytes(h.disk.usedBytes)} / ${bytes(h.disk.totalBytes)}`,
    ];
    console.log(lines.join("\n"));
  },
});
