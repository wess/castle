#!/usr/bin/env bash
# Bootstrap a slim Debian host for Castle.
# Idempotent: safe to re-run.
set -euo pipefail

log() { echo "==> $*"; }

log "apt update"
sudo apt-get update -y

log "installing base packages"
sudo apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg unzip \
  iproute2 bridge-utils \
  lxc lxc-templates lxcfs uidmap \
  docker.io \
  acl

log "enabling docker"
sudo systemctl enable --now docker

log "adding $USER to docker + lxc groups"
sudo usermod -aG docker "$USER" || true
getent group lxd >/dev/null 2>&1 && sudo usermod -aG lxd "$USER" || true

log "installing bun"
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi
# Symlink bun system-wide so systemd / non-login shells find it.
if [ -x "$HOME/.bun/bin/bun" ] && [ ! -e /usr/local/bin/bun ]; then
  sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
fi

log "creating /opt/castle and castle user"
sudo install -d -o "$USER" -g "$USER" -m 0755 /opt/castle
sudo install -d -o "$USER" -g "$USER" -m 0755 /etc/castle
sudo install -d -o "$USER" -g "$USER" -m 0755 /var/lib/castle

log "granting castle user access to /var/run/docker.sock via docker group"
# group membership already added; will take effect next login

log "done"
docker --version || true
lxc-ls --version || true
bun --version || true
