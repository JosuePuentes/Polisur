#!/bin/sh
# Arranque en Render (Node nativo): migraciones, almacén de evidencias y API.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREFERRED_EVIDENCE_DIR="${EVIDENCE_STORAGE_DIR:-/var/data/uploads/evidence}"

if command -v timeout >/dev/null 2>&1; then
  MKDIR_CMD="timeout 5 mkdir -p"
else
  MKDIR_CMD="mkdir -p"
fi

if $MKDIR_CMD "$PREFERRED_EVIDENCE_DIR" 2>/dev/null; then
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
  if command -v timeout >/dev/null 2>&1; then
    timeout 120 npm run db:migrate:production --prefix packages/database
  else
    npm run db:migrate:production --prefix packages/database
  fi
fi

exec node apps/api/dist/main.js
