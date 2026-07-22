# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

# Root (backend) production + build deps.
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

FROM deps AS prod-deps
RUN npm prune --omit=dev

# admin-web deps (nested install with its own lockfile). Kept in a dedicated
# stage so the built node_modules can be copied straight into the runner: the
# backend embeds Next via require("apps/admin-web/node_modules/next").
FROM base AS adminweb-deps
COPY package.json package-lock.json ./
COPY apps/admin-web/package.json apps/admin-web/package-lock.json ./apps/admin-web/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix apps/admin-web --ignore-scripts

FROM base AS builder
ENV SKIP_NEXT_VALIDATION=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=adminweb-deps /app/apps/admin-web/node_modules ./apps/admin-web/node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY apps ./apps
COPY packages ./packages
# Backend -> dist/, then admin-web -> apps/admin-web/.next
RUN npm run build
RUN --mount=type=cache,target=/app/apps/admin-web/.next/cache npm run build:admin-web

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV APP_PORT=3006
ENV NEXT_TELEMETRY_DISABLED=1

# Backend runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY src/db/migrations ./src/db/migrations
COPY package.json package-lock.json ./

# Embedded admin-web (Next.js): its own node_modules (with `next`), the build
# output, config and public assets. `initAdminWeb` runs next({ dev:false }).
COPY --from=adminweb-deps /app/apps/admin-web/node_modules ./apps/admin-web/node_modules
COPY --from=builder /app/apps/admin-web/.next ./apps/admin-web/.next
COPY apps/admin-web/package.json apps/admin-web/next.config.ts ./apps/admin-web/
COPY apps/admin-web/public ./apps/admin-web/public

EXPOSE 3006

CMD ["node", "dist/src/server.js"]
