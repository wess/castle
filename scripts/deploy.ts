#!/usr/bin/env bun
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const envFile = resolve(root, ".env")
const tarball = resolve(root, "dist/castle.tar.gz")
const installScript = resolve(root, "scripts/install.sh")
const releaseScript = resolve(root, "scripts/release.sh")
const sshKey = resolve(process.env.HOME ?? "", ".ssh/id_castle")

const fail = (msg: string): never => {
  console.error(`deploy: ${msg}`)
  process.exit(1)
}

const parseEnv = (text: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

if (!existsSync(envFile)) fail(`missing ${envFile}`)
const cfg = parseEnv(await Bun.file(envFile).text())
const host = cfg.SSH_HOST ?? fail("SSH_HOST missing from .env")
const user = cfg.SSH_USER ?? fail("SSH_USER missing from .env")
const pass = cfg.SSH_PASS ?? fail("SSH_PASS missing from .env")

if (!existsSync(sshKey)) fail(`missing ssh key at ${sshKey}`)

const run = async (cmd: string[], opts: { quiet?: boolean } = {}): Promise<void> => {
  if (!opts.quiet) console.log(`==> ${cmd.join(" ")}`)
  const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit" })
  const code = await proc.exited
  if (code !== 0) fail(`exit ${code}: ${cmd[0]}`)
}

const sshOpts = ["-i", sshKey, "-o", "StrictHostKeyChecking=no"]
const target = `${user}@${host}`

console.log(`==> building release`)
await run(["bash", releaseScript])

if (!existsSync(tarball)) fail(`build did not produce ${tarball}`)

console.log(`==> copying to ${target}:/tmp/`)
await run(["scp", ...sshOpts, tarball, installScript, `${target}:/tmp/`])

console.log(`==> running install on ${host}`)
await run(["ssh", ...sshOpts, target, `echo ${JSON.stringify(pass)} | sudo -S bash /tmp/install.sh`])

console.log(`==> smoke test`)
const res = await fetch(`http://${host}/api/host`, {
  signal: AbortSignal.timeout(5_000),
}).catch((e) => e as Error)
if (res instanceof Error || !res.ok) {
  console.log(`   server reachable: no (${res instanceof Error ? res.message : res.status})`)
} else {
  console.log(`   server reachable: yes (${res.status})`)
}

console.log(`==> done`)
