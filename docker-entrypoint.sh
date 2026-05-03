#!/bin/sh
set -e

echo "[entrypoint] Running migrations..."
node dist/src/scripts/db-migrate.js

echo "[entrypoint] Starting app..."
exec node dist/src/server.js
