#!/usr/bin/env bash
# Publish extra .local hostnames over mDNS via avahi-publish-address.
# Reads /etc/castle/mdns-aliases (one hostname per line). Each line is
# announced as an A record pointing to this host's primary IPv4.
set -euo pipefail

ALIAS_FILE=${ALIAS_FILE:-/etc/castle/mdns-aliases}

if [ ! -f "$ALIAS_FILE" ]; then
  echo "no alias file at $ALIAS_FILE" >&2
  exit 1
fi

# Pick the IPv4 address on the interface that owns the default route.
# `hostname -I` orders by interface enumeration, which on hosts that run
# LXC/Docker can put `lxcbr0` (10.0.3.1) or a docker bridge first — those
# aren't reachable from the LAN.
DEFAULT_IFACE=$(ip route show default 2>/dev/null | awk '/^default/ {print $5; exit}')
if [ -z "$DEFAULT_IFACE" ]; then
  echo "could not determine default-route interface" >&2
  exit 1
fi
IP=$(ip -4 -o addr show dev "$DEFAULT_IFACE" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1)
if [ -z "$IP" ]; then
  echo "could not determine IPv4 on $DEFAULT_IFACE" >&2
  exit 1
fi
echo "using IP $IP (via $DEFAULT_IFACE)"

pids=()
trap 'for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done' TERM INT EXIT

while IFS= read -r alias; do
  alias=$(echo "$alias" | sed 's/#.*//; s/^ *//; s/ *$//')
  [ -z "$alias" ] && continue
  echo "publishing $alias -> $IP"
  avahi-publish-address -R "$alias" "$IP" &
  pids+=("$!")
done < "$ALIAS_FILE"

wait
