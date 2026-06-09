# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/admin-web/package.json apps/admin-web/package-lock.json ./apps/admin-web/
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
RUN --mount=type=cache,target=/root/.npm npm ci --prefix apps/admin-web --ignore-scripts

FROM base AS builder
ENV SKIP_NEXT_VALIDATION=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin-web/node_modules ./apps/admin-web/node_modules

COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY apps/admin-web ./apps/admin-web
COPY packages ./packages

RUN --mount=type=cache,target=/app/apps/admin-web/.next/cache npm run build:admin-web

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public

EXPOSE 3000

CMD ["node", "apps/admin-web/server.js"]
