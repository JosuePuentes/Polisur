#!/bin/sh
set -e

echo "[polisur-api] Sincronizando esquema de base de datos…"
cd /app/packages/database

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null | grep -v migration_lock.toml)" ]; then
  sh ./prisma/migrate-production.sh
else
  npx prisma db push --schema=./prisma/schema.prisma --skip-generate
fi

echo "[polisur-api] Verificando almacén de evidencias…"
EVIDENCE_DIR="${EVIDENCE_STORAGE_DIR:-/var/data/evidence}"
mkdir -p "$EVIDENCE_DIR" 2>/dev/null || true

echo "[polisur-api] Iniciando servidor NestJS…"
cd /app/apps/api
exec node dist/main.js
