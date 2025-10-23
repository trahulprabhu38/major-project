#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${POSTGRES_DB:-osm}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASS=${POSTGRES_PASSWORD:-postgres}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
SQL_FILE="$ROOT_DIR/backend/sql/views.sql"

export PGPASSWORD="$DB_PASS"
psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "Views applied."



