// Pure schema-diff helpers for cross-connection schema comparison.

import type { ColumnInfoRaw } from "./adapters/types.ts";

export const columnSignature = (col: ColumnInfoRaw): string =>
  `${col.dataType}|${col.nullable ? "null" : "notnull"}|${col.isPrimaryKey ? "pk" : ""}`;

export const diffColumns = (source: ColumnInfoRaw[], target: ColumnInfoRaw[]): string[] => {
  const out: string[] = [];
  const targetByName = new Map(target.map((col) => [col.name, col]));
  const sourceByName = new Map(source.map((col) => [col.name, col]));
  for (const col of source) {
    const other = targetByName.get(col.name);
    if (!other) {
      out.push(`column "${col.name}" only in source`);
    } else if (columnSignature(col) !== columnSignature(other)) {
      out.push(`column "${col.name}" differs (${columnSignature(col)} vs ${columnSignature(other)})`);
    }
  }
  for (const col of target) {
    if (!sourceByName.has(col.name)) out.push(`column "${col.name}" only in target`);
  }
  return out;
};

export type TableSetDiff = {
  onlyInSource: string[];
  onlyInTarget: string[];
  shared: string[];
};

export const diffTableSets = (source: string[], target: string[]): TableSetDiff => {
  const sourceNames = new Set(source);
  const targetNames = new Set(target);
  return {
    onlyInSource: [...sourceNames].filter((n) => !targetNames.has(n)).sort(),
    onlyInTarget: [...targetNames].filter((n) => !sourceNames.has(n)).sort(),
    shared: [...sourceNames].filter((n) => targetNames.has(n)).sort(),
  };
};
