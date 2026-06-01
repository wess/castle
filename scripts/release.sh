#!/usr/bin/env bash
# Build a deployable Castle tarball at dist/castle.tar.gz
set -euo pipefail

cd "$(dirname "$0")/.."

ROOT=$(pwd)
OUT=$ROOT/dist
STAGE=$ROOT/dist/stage

rm -rf "$OUT"
mkdir -p "$STAGE/server" "$STAGE/web"

echo "==> building web"
(cd apps/web && bun x vite build)
cp -R apps/web/dist/. "$STAGE/web/"

echo "==> bundling server"
bun build apps/server/src/index.ts --target=bun --outdir="$STAGE/server" --minify >/dev/null
mv "$STAGE/server/index.js" "$STAGE/server/castled.js"

echo "==> recording version"
VERSION=$(bun --print "require('$ROOT/package.json').version")
BUILT_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)
{
  echo "version=$VERSION"
  echo "commit=$COMMIT"
  echo "builtAt=$BUILT_AT"
} > "$STAGE/version.txt"

echo "==> tarring"
tar -C "$STAGE" -czf "$OUT/castle.tar.gz" .
ls -lh "$OUT/castle.tar.gz"
