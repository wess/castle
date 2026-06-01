export const id = (prefix: string): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return `${prefix}_${out}`;
};
