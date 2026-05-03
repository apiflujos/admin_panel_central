#!/bin/sh
set -e

echo "[entrypoint] Running migrations..."
node dist/scripts/db-migrate.js

echo "[entrypoint] Starting app..."
exec node dist/server.js
