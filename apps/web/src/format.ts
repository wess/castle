export const bytes = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  const v = n / 1024 ** i;
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};

export const duration = (s: number): string => {
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const ago = (ms: number): string => {
  if (!ms) return "";
  return `${duration((Date.now() - ms) / 1000)} ago`;
};

export const percent = (n: number): string => `${Math.round(n * 100)}%`;

export const shortId = (id: string): string => id.slice(0, 12);
