#!/bin/sh
# Provision per-app roles and databases on first postgres init.
# This runs only on a fresh data dir (postgres image semantics).
set -eu

run() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "$1"
}

run "CREATE ROLE castle LOGIN PASSWORD '$CASTLE_DB_PASSWORD'"
run "CREATE DATABASE castle OWNER castle"

run "CREATE ROLE tangle LOGIN PASSWORD '$TANGLE_DB_PASSWORD'"
run "CREATE DATABASE tangle OWNER tangle"

run "CREATE ROLE stohr LOGIN PASSWORD '$STOHR_DB_PASSWORD'"
run "CREATE DATABASE stohr OWNER stohr"
