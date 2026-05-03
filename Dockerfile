# Workers — BullMQ + crons (proceso separado de Next.js)

# ── Etapa 1: build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY scripts ./scripts
COPY apps/workers ./apps/workers
COPY packages ./packages
COPY src ./src

RUN node scripts/build.js

# ── Etapa 2: runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/apps/workers/src/bootstrap.js"]
