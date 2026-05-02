FROM node:22-alpine AS builder
WORKDIR /app

COPY apps/admin-web/package*.json ./apps/admin-web/
WORKDIR /app/apps/admin-web
RUN npm install --no-audit --no-fund

WORKDIR /app
COPY apps/admin-web ./apps/admin-web
COPY packages ./packages

WORKDIR /app/apps/admin-web
ENV NEXT_TELEMETRY_DISABLED=1
RUN node node_modules/next/dist/bin/next build

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/admin-web/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/apps/admin-web ./
COPY --from=builder /app/packages /app/packages

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3100

CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3100"]
