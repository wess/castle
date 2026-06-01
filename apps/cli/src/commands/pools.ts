import { command } from "@atlas/cli";
import type { Pool } from "@castle/core";
import { request } from "../client.ts";
import { bytes } from "../format.ts";
import { table } from "../table.ts";

export const pools = command("pools", {
  description: "List storage pools",
  run: async () => {
    const data = await request<Pool[]>("GET", "/storage/pools");
    console.log(
      table(
        data.map((p) => ({
          name: p.name,
          kind: p.kind,
          path: p.path,
          used: bytes(p.usedBytes),
          total: bytes(p.totalBytes),
        })),
      ),
    );
  },
});
