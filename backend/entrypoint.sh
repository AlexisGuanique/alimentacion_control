#!/bin/bash
set -e

echo "=== NutriTrack Backend Startup ==="

# Use DATABASE_URL env var if set, otherwise default
DB_URL="${DATABASE_URL:-sqlite:///./database.db}"
echo "Database URL: $DB_URL"

# Run Alembic migrations (pass URL so it uses the correct DB in production)
echo "Running database migrations..."
alembic -x sqlalchemy.url="$DB_URL" upgrade head 2>&1 || echo "Migration warning (may already be applied, continuing...)"

echo "Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
