#!/usr/bin/env bash
# Manage nginx sites-enabled symlinks. Invoked by castled via sudo.
# Usage: castle-nginx-site enable|disable <name>
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $(basename "$0") enable|disable <name>" >&2
  exit 1
fi

ACTION=$1
NAME=$2

if ! [[ "$NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "invalid site name" >&2
  exit 1
fi

AVAILABLE=/etc/nginx/sites-available
ENABLED=/etc/nginx/sites-enabled

case "$ACTION" in
  enable)
    if [ ! -f "$AVAILABLE/$NAME" ]; then
      echo "no such site: $NAME" >&2
      exit 1
    fi
    ln -sf "$AVAILABLE/$NAME" "$ENABLED/$NAME"
    ;;
  disable)
    rm -f "$ENABLED/$NAME"
    ;;
  *)
    echo "unknown action: $ACTION" >&2
    exit 1
    ;;
esac
