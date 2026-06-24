# ─────────────────────────────────────────────────────────────────────────────
# Polisur Admin Web — Multi-stage production build (Next.js 15 standalone)
# Contexto de build: raíz del monorepo
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Etapa 1: dependencias ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app/apps/admin-web

COPY apps/admin-web/package.json ./
RUN npm install

# ── Etapa 2: build Next.js ───────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app/apps/admin-web

COPY --from=deps /app/apps/admin-web/node_modules ./node_modules
COPY apps/admin-web/ ./

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Etapa 3: runtime standalone ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public

RUN chown -R nextjs:nodejs /app

WORKDIR /app/apps/admin-web
USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
