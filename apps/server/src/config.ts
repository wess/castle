import { env } from "@atlas/config";

const port = env("PORT", { default: "4280", parse: Number });
const host = env("HOST", { default: "0.0.0.0" });
const dockerSocket = env("DOCKER_SOCKET", { default: "/var/run/docker.sock" });
const webOrigin = env("WEB_ORIGIN", { default: "http://localhost:5173" });
const databaseUrl = env("DATABASE_URL", { default: "postgres://castle:castle@127.0.0.1:5432/castle" });
const secret = env("SECRET", { default: "change-me-to-a-long-random-string" });
const adminEmail = env("CASTLE_ADMIN_EMAIL", { default: "admin@castle.local" });
const adminPassword = env("CASTLE_ADMIN_PASSWORD", { default: "" });
const webRoot = env("WEB_ROOT", { default: "" });
// External URL the OIDC issuer advertises in id_tokens and the catalog
// passes to apps as SSO_ISSUER. Set this to "http://castle.local" on
// production deploys so relying parties can reach the JWKS over mDNS.
const publicUrl = env("CASTLE_PUBLIC_URL", { default: "http://castle.local" });

export const config = () => ({
  port: port.read(),
  host: host.read(),
  dockerSocket: dockerSocket.read(),
  webOrigin: webOrigin.read(),
  databaseUrl: databaseUrl.read(),
  secret: secret.read(),
  adminEmail: adminEmail.read(),
  adminPassword: adminPassword.read(),
  webRoot: webRoot.read(),
  publicUrl: publicUrl.read(),
});
