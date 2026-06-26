#!/bin/sh
# Despliegue seguro: baseline automático si la DB ya existía (db push) y migrate deploy.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/prisma/schema.prisma"
INIT_MIGRATION="20260501000000_init"
CHECK_SQL="$ROOT/prisma/scripts/check-departments.sql"

cd "$ROOT"

echo "[prisma] Comprobando estado de la base de datos…"

if npx prisma db execute --file "$CHECK_SQL" --schema="$SCHEMA" >/dev/null 2>&1; then
  echo "[prisma] Base existente detectada — marcando migración inicial como aplicada (baseline)."
  npx prisma migrate resolve --applied "$INIT_MIGRATION" --schema="$SCHEMA" >/dev/null 2>&1 || true
else
  echo "[prisma] Base nueva — se aplicará el esquema completo desde migraciones."
fi

echo "[prisma] Ejecutando prisma migrate deploy…"
npx prisma migrate deploy --schema="$SCHEMA"
echo "[prisma] Migraciones aplicadas correctamente."
