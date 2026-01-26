# Alegra + Shopify Middleware (Base)

Starter scaffolding for the integration middleware and dashboard API.

## Quick start
1) Copy `.env.example` to `.env` and fill the values.
2) Install dependencies: `npm install`
3) Run dev server: `npm run dev`

## Notes
- Webhook endpoint: `POST /api/webhooks/shopify`
- Webhook endpoint: `POST /api/webhooks/alegra`
- Shopify client uses GraphQL Admin API (see `src/connectors/shopify.ts`)
- Health check: `GET /health`
- Database DDL: `src/db/migrations/001_init.sql`

## Required env vars for sync
- `APP_ORG_ID`, `DATABASE_URL`, `CRYPTO_KEY_BASE64`
- `SHOPIFY_WEBHOOK_SECRET` (required for Shopify webhook validation)
- `ALEGRA_WEBHOOK_SECRET` (optional, for signature validation)

## Credential storage
- Shopify and Alegra credentials are stored encrypted in `credentials.data_encrypted`.
- Use the dashboard endpoint `PUT /api/settings` to save credentials.
  - Payload: `{ shopify: { shopDomain, accessToken, locationId, apiVersion }, alegra: { email, apiKey, warehouseId } }`

## Current limitations
- Mapping service uses Postgres (`sync_mappings`); apply migrations before running sync.
