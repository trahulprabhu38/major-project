#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

# unify env
source "$ROOT_DIR/env.sh" 2>/dev/null || true

echo "[1/6] Starting Docker services (PostGIS, pg_tileserv)"
docker compose up -d

echo "[1.5/6] Waiting for database to accept connections"
bash "$ROOT_DIR/scripts/wait_for_db.sh"

echo "[1.6/6] Verifying DB credentials (inside container)"
docker exec -i postgis psql -U postgres -d osm -c "SELECT 1;" >/dev/null

echo "[2/6] Downloading OSM extract (skips if bengaluru.osm.gz exists)"
bash "$ROOT_DIR/scripts/download_bengaluru.sh" || true

echo "[3/6] Selecting extract and importing into PostGIS"
PBF_PATH="$ROOT_DIR/data/karnataka-latest.osm.pbf"
FALLBACK_XML_GZ="$ROOT_DIR/data/bengaluru.osm.gz"

# Helper to get file size (0 if missing)
filesize() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0; }

PBF_SIZE=$(filesize "$PBF_PATH")
FALLBACK_SIZE=$(filesize "$FALLBACK_XML_GZ")

TO_IMPORT=""
if [[ -f "$PBF_PATH" && "$PBF_SIZE" -gt 1000000 ]]; then
  TO_IMPORT="$PBF_PATH"
elif [[ -f "$FALLBACK_XML_GZ" && "$FALLBACK_SIZE" -gt 1000000 ]]; then
  TO_IMPORT="$FALLBACK_XML_GZ"
else
  echo "No valid extract found to import. Sizes: PBF=$PBF_SIZE, OSM.GZ=$FALLBACK_SIZE" >&2
  exit 1
fi

echo "Importing file: $TO_IMPORT"
bash "$ROOT_DIR/scripts/import_osm.sh" "$TO_IMPORT"

echo "[4/6] Applying SQL views for Kannada"
bash "$ROOT_DIR/scripts/apply_views.sh"

echo "[5/6] Setting up Python venv and installing requirements"
python3 -m venv .venv || true
source .venv/bin/activate
pip install -U pip >/dev/null
pip install -r backend/translation/requirements.txt

echo "[6/6] Running translation pipeline"
python backend/translation/translate_kn.py

echo "Done. pg_tileserv at http://localhost:7800, React app: see frontend-react instructions in README."


