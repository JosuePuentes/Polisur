#!/bin/sh
# Arranque en Render (Node nativo): prepara almacén de evidencias y lanza la API.
set -e

EVIDENCE_DIR="${EVIDENCE_STORAGE_DIR:-/var/data/evidence}"
mkdir -p "$EVIDENCE_DIR" 2>/dev/null || mkdir -p "./uploads/evidence"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec node apps/api/dist/main.js
