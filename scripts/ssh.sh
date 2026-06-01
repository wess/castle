#!/usr/bin/env bash
# Convenience SSH wrapper for the deploy target.
set -euo pipefail
exec ssh -i "$HOME/.ssh/id_castle" -o StrictHostKeyChecking=no wess@192.168.4.87 "$@"
