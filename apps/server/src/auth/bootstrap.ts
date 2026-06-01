import type { Db } from "../db/index.ts";

const randomPassword = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let s = "";
  for (const b of bytes) s += b.toString(36).padStart(2, "0");
  return s.slice(0, 24);
};

export const ensureAdmin = async (db: Db, email: string, presetPassword: string): Promise<void> => {
  const existing = (await db`SELECT id FROM users LIMIT 1`) as { id: number }[];
  if (existing.length > 0) return;

  const password = presetPassword.length > 0 ? presetPassword : randomPassword();
  const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
  const local = email.split("@")[0] ?? "admin";
  const username =
    local
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 32) || "admin";
  await db`
    INSERT INTO users (email, password, username, name)
    VALUES (${email}, ${hash}, ${username}, ${local})
  `;

  const line = "═".repeat(60);
  console.log(`\n${line}`);
  console.log("CASTLE first-run admin user created");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log("Set CASTLE_ADMIN_PASSWORD in .env to override, or change later.");
  console.log(`${line}\n`);
};
