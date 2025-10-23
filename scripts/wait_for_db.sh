#!/usr/bin/env bash
set -euo pipefail

HOST=${POSTGRES_HOST:-localhost}
PORT=${POSTGRES_PORT:-5432}
TIMEOUT=${DB_WAIT_TIMEOUT:-60}

echo "Waiting for Postgres at $HOST:$PORT (timeout ${TIMEOUT}s)..."
start=$(date +%s)
while true; do
  if (echo > /dev/tcp/$HOST/$PORT) >/dev/null 2>&1; then
    echo "Postgres port is open."
    exit 0
  fi
  now=$(date +%s)
  if (( now - start > TIMEOUT )); then
    echo "Timed out waiting for Postgres at $HOST:$PORT" >&2
    exit 1
  fi
  sleep 1
done


