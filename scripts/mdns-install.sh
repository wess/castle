#!/usr/bin/env bash
# Install the mDNS alias publisher. Expects /tmp/castle-mdns/ populated by rsync.
set -euo pipefail

SRC=${SRC:-/tmp/castle-mdns}

log() { echo "==> $*"; }
if [ "$(id -u)" -ne 0 ]; then
  echo "must run as root (sudo)"; exit 1
fi

if ! command -v avahi-publish-address >/dev/null 2>&1; then
  log "installing avahi-utils"
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends avahi-utils
fi

install -m 0755 "$SRC/publish.sh" /usr/local/bin/castle-mdns
install -m 0644 "$SRC/castlemdns.service" /etc/systemd/system/castle-mdns.service

mkdir -p /etc/castle
if [ ! -f /etc/castle/mdns-aliases ]; then
  install -m 0644 "$SRC/aliases" /etc/castle/mdns-aliases
fi
# Castle daemon (wess) edits this file via the web UI.
chown root:wess /etc/castle/mdns-aliases
chmod 0664 /etc/castle/mdns-aliases

# Sudoers fragment so castle can reload the mDNS publisher without password.
install -m 0440 "$SRC/sudoers.castle" /etc/sudoers.d/castle-mdns
visudo -cf /etc/sudoers.d/castle-mdns >/dev/null

systemctl daemon-reload
systemctl enable castle-mdns.service
systemctl restart castle-mdns.service
sleep 1
systemctl is-active castle-mdns.service

log "done"
