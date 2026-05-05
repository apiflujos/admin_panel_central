FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY apps ./apps
COPY packages ./packages
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY src/db/migrations ./src/db/migrations
EXPOSE 3006
CMD ["node", "dist/src/server.js"]
