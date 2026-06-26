#!/bin/sh
# Arranque en Render (Node nativo): migraciones, almacén de evidencias y API.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREFERRED_EVIDENCE_DIR="${EVIDENCE_STORAGE_DIR:-/var/data/uploads/evidence}"

if mkdir -p "$PREFERRED_EVIDENCE_DIR" 2>/dev/null; then
  export EVIDENCE_STORAGE_DIR="$PREFERRED_EVIDENCE_DIR"
  echo "[start-api] Almacén de evidencias: $EVIDENCE_STORAGE_DIR"
else
  FALLBACK_EVIDENCE_DIR="$ROOT/uploads/evidence"
  mkdir -p "$FALLBACK_EVIDENCE_DIR"
  export EVIDENCE_STORAGE_DIR="$FALLBACK_EVIDENCE_DIR"
  echo "[start-api] WARN: disco /var/data no disponible — almacén efímero en $EVIDENCE_STORAGE_DIR"
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[start-api] Aplicando migraciones de base de datos…"
  npm run db:migrate:production --prefix packages/database
fi

exec node apps/api/dist/main.js
