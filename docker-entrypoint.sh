#!/bin/sh
# Sync the SQLite schema then exec whatever was passed as CMD.
# `db push` is idempotent: first run creates the DB + tables, later
# runs apply any schema changes that have rolled in with new code.
set -e

echo "[yafa] Syncing schema to ${DATABASE_URL}..."
npx --no-install prisma db push --accept-data-loss --skip-generate

echo "[yafa] Starting server..."
exec "$@"
