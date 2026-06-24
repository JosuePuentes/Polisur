#!/bin/sh
set -e

echo "[polisur-api] Sincronizando esquema de base de datos…"
cd /app/packages/database

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy --schema=./prisma/schema.prisma
else
  npx prisma db push --schema=./prisma/schema.prisma --skip-generate
fi

echo "[polisur-api] Iniciando servidor NestJS…"
cd /app/apps/api
exec node dist/main.js
