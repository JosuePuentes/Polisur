#!/bin/sh
# Arranque en Render (Node nativo): migraciones, almacén de evidencias y API.
set -e

EVIDENCE_DIR="${EVIDENCE_STORAGE_DIR:-/var/data/evidence}"
mkdir -p "$EVIDENCE_DIR" 2>/dev/null || mkdir -p "./uploads/evidence"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -n "$DATABASE_URL" ]; then
  echo "[start-api] Aplicando migraciones de base de datos…"
  npm run db:migrate:production --prefix packages/database
fi

exec node apps/api/dist/main.js
