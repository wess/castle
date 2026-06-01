#!/usr/bin/env bash
# Provision /opt/services/: shared postgres + tangle + stohr.
# Idempotent. Run as root (sudo).
set -euo pipefail

SVC_DIR=/opt/services
CFG_DIR=/etc/castle-services
ENV_FILE=$CFG_DIR/services.env

log() { echo "==> $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "must run as root (sudo)"
  exit 1
fi

# 1. Make sure docker CLI + compose v2 are available. Debian's `docker.io`
#    only installs the daemon; `docker-cli` is a separate package and
#    `docker-compose` ships the v2 binary at /usr/bin/docker-compose.
if ! command -v docker >/dev/null 2>&1; then
  log "installing docker-cli"
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker-cli
fi
if ! command -v docker-compose >/dev/null 2>&1; then
  log "installing docker-compose"
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker-compose
fi
# Wire docker-compose as a docker CLI plugin so `docker compose` works.
PLUGIN_DIR=/usr/libexec/docker/cli-plugins
mkdir -p "$PLUGIN_DIR"
if [ ! -e "$PLUGIN_DIR/docker-compose" ]; then
  ln -sf /usr/bin/docker-compose "$PLUGIN_DIR/docker-compose"
fi

mkdir -p "$SVC_DIR" "$CFG_DIR"

# 2. Clone (or update) tangle + stohr.
# Rewrite the SSH submodule URL in tangle to HTTPS so non-key clones work.
GIT_SUBMOD_HTTPS=(-c url."https://github.com/".insteadOf="git@github.com:")

clone_repo() {
  local name=$1 url=$2
  if [ ! -d "$SVC_DIR/$name/.git" ]; then
    log "cloning $name"
    rm -rf "$SVC_DIR/$name"
    git "${GIT_SUBMOD_HTTPS[@]}" clone --recurse-submodules "$url" "$SVC_DIR/$name"
  else
    log "updating $name"
    git -C "$SVC_DIR/$name" fetch origin main
    git -C "$SVC_DIR/$name" reset --hard origin/main
    git -C "$SVC_DIR/$name" "${GIT_SUBMOD_HTTPS[@]}" submodule update --init --recursive
  fi
}

clone_repo tangle https://github.com/wess/tangle
clone_repo stohr  https://github.com/wess/stohr

# 3. Compose + init script land via the deploy step (rsync). Just sanity-check.
if [ ! -f "$SVC_DIR/compose.yaml" ]; then
  echo "missing $SVC_DIR/compose.yaml — rsync the scripts/services/ tree first"
  exit 1
fi

# 4. Generate per-service secrets once.
randpass() { head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 24; }
randsecret() { head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48; }

if [ ! -f "$ENV_FILE" ]; then
  log "generating $ENV_FILE"
  cat > "$ENV_FILE" <<EOF
POSTGRES_ROOT_PASSWORD=$(randpass)
CASTLE_DB_PASSWORD=$(randpass)
TANGLE_DB_PASSWORD=$(randpass)
STOHR_DB_PASSWORD=$(randpass)
TANGLE_SECRET=$(randsecret)
STOHR_SECRET=$(randsecret)
EOF
  chmod 0640 "$ENV_FILE"
  chown root:wess "$ENV_FILE"
fi

# Mirror the env file into the compose dir so `docker compose` picks it up.
ln -sf "$ENV_FILE" "$SVC_DIR/.env"

# 5. Bring the stack up.
log "compose up"
cd "$SVC_DIR"
docker compose pull postgres
docker compose up -d --build

# 6. Wait for postgres to be ready.
log "waiting for postgres"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# 7. Print the castle DB password so the castle install can wire it in.
log "summary"
grep -E '^(CASTLE_DB_PASSWORD|POSTGRES_ROOT_PASSWORD)=' "$ENV_FILE"
docker compose ps
