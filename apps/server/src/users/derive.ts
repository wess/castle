const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export const isValidUsername = (s: string): boolean => USERNAME_RE.test(s);

export const normalizeUsername = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

export const usernameFromEmail = (email: string): string => {
  const local = email.split("@")[0] ?? "user";
  const u = normalizeUsername(local);
  return u.length >= 3 ? u : `${u}user`.slice(0, 32);
};

export const nameFromEmail = (email: string): string => email.split("@")[0] ?? "User";
