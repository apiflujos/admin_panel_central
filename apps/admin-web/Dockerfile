# ── Etapa 1: dependencias ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Root deps (pg, ioredis, bullmq, etc. — usados por src/services/)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Deps de Next.js
COPY apps/admin-web/package*.json ./apps/admin-web/
RUN npm ci --prefix apps/admin-web --ignore-scripts

# ── Etapa 2: build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin-web/node_modules ./apps/admin-web/node_modules

COPY package*.json ./
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY apps/admin-web ./apps/admin-web
COPY packages ./packages

# Compila el script de migración
RUN node scripts/build.js

# Compila Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:admin-web

# ── Etapa 3: runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runtime deps para migraciones y servicios server-side compartidos
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Standalone Next.js (incluye node_modules runtime: pg, ioredis, etc.)
COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static

# Script de migración compilado
COPY --from=builder /app/dist/src/scripts/db-migrate.js ./dist/src/scripts/db-migrate.js
COPY --from=builder /app/dist/src/db ./dist/src/db
COPY --from=builder /app/src/db/migrations ./src/db/migrations

EXPOSE 3000

# El runtime no auto-aplica migraciones: se ejecutan aparte con npm run db:migrate.
CMD ["node", "apps/admin-web/server.js"]
