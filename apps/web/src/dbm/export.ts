// Pure serializers for table export (csv/json/sql). No DOM/IO here so this
// can be unit-tested and reused by the browser download helper in butter.ts.

export type ExportFormat = "csv" | "json" | "sql";

export const escapeCsv = (value: unknown): string => {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export const sqlValue = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

export const serialize = (
  format: ExportFormat,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  includeHeaders: boolean,
): string => {
  if (format === "json") return JSON.stringify(rows, null, 2);
  if (format === "sql") {
    const cols = columns.map(quoteIdent).join(", ");
    return rows
      .map((row) => {
        const values = columns.map((col) => sqlValue(row[col])).join(", ");
        return `INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${values});`;
      })
      .join("\n");
  }
  const lines: string[] = [];
  if (includeHeaders) lines.push(columns.map(escapeCsv).join(","));
  for (const row of rows) lines.push(columns.map((col) => escapeCsv(row[col])).join(","));
  return lines.join("\r\n");
};

export const mimeFor = (format: ExportFormat): string =>
  format === "json" ? "application/json" : format === "sql" ? "application/sql" : "text/csv";
