#!/bin/bash

# Migration Script for PostgreSQL Database
# This script runs the 001_initial_schema.sql migration

echo "=================================="
echo "Running Database Migration"
echo "=================================="
echo ""

# Database connection details from .env
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-edu}"
DB_USER="${POSTGRES_USER:-admin}"

# Run the migration
echo "Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

PGPASSWORD="${POSTGRES_PASSWORD:-password}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f migrations/001_initial_schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✅ Migration completed successfully!"
    echo "=================================="
    echo ""
    echo "Verifying tables..."

    # Verify tables were created
    PGPASSWORD="${POSTGRES_PASSWORD:-password}" psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('see_marks', 'student_final_grades', 'semester_results', 'student_cgpa', 'final_cie_composition') ORDER BY table_name;"

    echo ""
    echo "Tables created successfully! ✅"
else
    echo ""
    echo "=================================="
    echo "❌ Migration failed!"
    echo "=================================="
    exit 1
fi
