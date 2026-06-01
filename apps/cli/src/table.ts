export const table = (rows: Record<string, string>[]): string => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const widths = headers.map((h) => Math.max(h.length, ...rows.map((r) => (r[h] ?? "").length)));

  const fmt = (vals: string[]): string => vals.map((v, i) => v.padEnd(widths[i]!)).join("  ");

  const lines: string[] = [];
  lines.push(fmt(headers.map((h) => h.toUpperCase())));
  for (const r of rows) lines.push(fmt(headers.map((h) => r[h] ?? "")));
  return lines.join("\n");
};
