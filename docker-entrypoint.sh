#!/bin/sh
# Sync the SQLite schema then exec whatever was passed as CMD.
# `db push` is idempotent: first run creates the DB + tables, later
# runs apply any schema changes that have rolled in with new code.
set -e

# Default to the in-container path so the script works even if the
# orchestrator forgot to set the env var.
: "${DATABASE_URL:=file:/data/yafa.db}"
export DATABASE_URL

echo "[yafa] Syncing schema to ${DATABASE_URL}..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "[yafa] Starting server..."
exec "$@"
