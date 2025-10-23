#!/usr/bin/env bash
set -euo pipefail

# Imports a .osm.pbf (preferred) or .osm/.osm.gz file into PostGIS using osm2pgsql
# Usage: scripts/import_osm.sh data/karnataka-latest.osm.pbf

PBF_PATH=${1:-}
if [[ -z "$PBF_PATH" ]]; then
  echo "Usage: $0 /abs/path/to/file.osm.pbf|.osm.gz|.osm" >&2
  exit 1
fi
if [[ ! -f "$PBF_PATH" ]]; then
  echo "File not found: $PBF_PATH" >&2
  exit 1
fi

DB_NAME=${POSTGRES_DB:-osm}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASS=${POSTGRES_PASSWORD:-postgres}
DB_PORT=${POSTGRES_PORT:-5432}

# Detect platform
UNAME=$(uname -s)
NET_ARGS=""
DB_HOST_LOCAL=${POSTGRES_HOST:-localhost}
if [[ "$UNAME" == "Darwin" ]]; then
  DB_HOST_DOCKER=${POSTGRES_HOST:-host.docker.internal}
  NET_ARGS=""
else
  DB_HOST_DOCKER=${POSTGRES_HOST:-localhost}
  NET_ARGS="--network host"
fi

echo "Importing $PBF_PATH into PostGIS database '$DB_NAME'"

# Detect input format
FORMAT_ARGS_STR=""
case "$PBF_PATH" in
  *.pbf) ;;
  *.osm.gz) FORMAT_ARGS_STR="--input-reader xml --unpack-urls" ;;
  *.osm) FORMAT_ARGS_STR="--input-reader xml" ;;
  *) echo "Unknown input format for $PBF_PATH" >&2; exit 1;;
esac

DOCKER_IMAGE=${OSM2PGSQL_IMAGE:-osm2pgsql/osm2pgsql:latest}

run_osm2pgsql_docker() {
  docker run --rm \
    $NET_ARGS \
    -v "$(realpath "$PBF_PATH")":/data.osm.pbf:ro \
    -e PGPASSWORD="$DB_PASS" \
    "$DOCKER_IMAGE" \
    osm2pgsql \
      --create \
      --database "$DB_NAME" \
      --username "$DB_USER" \
      --host "$DB_HOST_DOCKER" \
      --port "$DB_PORT" \
      --hstore \
      --slim \
      --latlong \
      --extra-attributes \
      $FORMAT_ARGS_STR \
      /data.osm.pbf
}

# Prefer local osm2pgsql if installed
if command -v osm2pgsql >/dev/null 2>&1; then
  echo "Using local osm2pgsql binary"
  PGPASSWORD="$DB_PASS" osm2pgsql \
    --create \
    --database "$DB_NAME" \
    --username "$DB_USER" \
    --host "$DB_HOST_LOCAL" \
    --port "$DB_PORT" \
    --hstore \
    --slim \
    --latlong \
    --extra-attributes \
    $FORMAT_ARGS_STR \
    "$PBF_PATH"
else
  echo "Local osm2pgsql not found, using Docker image: $DOCKER_IMAGE"
  run_osm2pgsql_docker
fi

echo "Import completed successfully."
