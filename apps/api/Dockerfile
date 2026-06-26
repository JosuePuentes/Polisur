# ─────────────────────────────────────────────────────────────────────────────
# Polisur API — Multi-stage production build (NestJS + @polisur/database)
# Contexto de build: raíz del monorepo
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Etapa 1: compilar paquete @polisur/database ─────────────────────────────
FROM base AS database-build
WORKDIR /app/packages/database

COPY packages/database/package.json ./
RUN npm install

COPY packages/database/prisma ./prisma
COPY packages/database/tsconfig.json ./
COPY packages/database/tsconfig.build.json ./
COPY packages/database/src ./src

RUN npm run build && npx prisma generate --schema=./prisma/schema.prisma

# ── Etapa 2: compilar API NestJS ─────────────────────────────────────────────
FROM base AS api-build
WORKDIR /app

COPY --from=database-build /app/packages/database ./packages/database
COPY apps/api/package.json ./apps/api/

WORKDIR /app/apps/api
RUN npm install

COPY apps/api/ ./
RUN npm run build && npm prune --omit=dev

# ── Etapa 3: imagen de producción mínima ─────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV EVIDENCE_STORAGE_DIR=/var/data/evidence
ENV NODE_OPTIONS=--max-old-space-size=512
ENV SHARP_CONCURRENCY=3

RUN addgroup --system --gid 1001 polisur && \
    adduser --system --uid 1001 --ingroup polisur polisur && \
    mkdir -p /var/data/evidence && \
    chown -R polisur:polisur /var/data

COPY --from=database-build /app/packages/database ./packages/database
COPY --from=api-build /app/apps/api/dist ./apps/api/dist
COPY --from=api-build /app/apps/api/package.json ./apps/api/package.json
COPY --from=api-build /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

RUN chmod +x /app/apps/api/docker-entrypoint.sh && \
    chown -R polisur:polisur /app

USER polisur
WORKDIR /app/apps/api
EXPOSE 3001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
