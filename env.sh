#!/usr/bin/env bash
# Central place for DB env vars used by compose and scripts
export POSTGRES_DB=${POSTGRES_DB:-osm}
export POSTGRES_USER=${POSTGRES_USER:-postgres}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
export POSTGRES_HOST=${POSTGRES_HOST:-localhost}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}


