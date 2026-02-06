# Alegra + Shopify Middleware (Base)

Starter scaffolding for the integration middleware and dashboard API.

## Quick start
1) Copy `.env.example` to `.env` and fill the values.
2) Install dependencies: `npm install`
3) Run dev server: `npm run dev`

## Deploy (Render)
- Blueprint: `render.yaml` (web + Postgres).
- Health check: `GET /health`
- Important env vars to set in Render:
  - `APP_HOST`: base URL (ej: `https://<tu-servicio>.onrender.com` o tu dominio)
  - `CRYPTO_KEY_BASE64`: 32 bytes en base64 (no lo cambies si ya tienes credenciales cifradas en la BD)
    - Generar (una sola vez): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  - `DATABASE_SSL=true` (si usas Postgres de Render)

## QA (smoke)
- Checklist: `docs/QA-FINAL.md`
- Script (requiere `QA_TOKEN` o `ADMIN_EMAIL`/`ADMIN_PASSWORD`):
  - `BASE_URL=https://<tu-servicio>.onrender.com QA_TOKEN=<token> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke`

## Notes
- Webhook endpoint: `POST /api/webhooks/shopify`
- Webhook endpoint: `POST /api/webhooks/alegra`
- Mass sync (Alegra → Shopify): `POST /api/sync/invoices` (crea pedidos/borradores desde facturas Alegra)
- Shopify client uses GraphQL Admin API (see `src/connectors/shopify.ts`)
- Health check: `GET /health`
- Database DDL: `src/db/migrations/001_init.sql`

## Marketing & Analytics (Enterprise)
- Shopify webhooks (HMAC): `POST /api/marketing/webhooks/shopify`
  - Topics soportados: `orders/create`, `orders/paid`, `checkouts/create`, `checkouts/update`, `customers/create`
- Pixel (key-gated):
  - Script: `GET /api/marketing/pixel.js?key=...` (instalar en `theme.liquid` antes de `</body>`)
  - Collector: `POST /api/marketing/collect?key=...`
- Sync/backfill (admin):
  - `POST /api/marketing/sync/orders` body: `{ "shopDomain": "tu-tienda.myshopify.com", "sinceDate": "YYYY-MM-DD", "maxOrders": 1500 }`
  - `POST /api/marketing/metrics/recompute` body: `{ "shopDomain": "...", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`
- Dashboard/insights (authed):
  - `GET /api/marketing/dashboard?shopDomain=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /api/marketing/insights?shopDomain=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- GraphQL interno (authed): `POST /api/marketing/graphql` query: `executiveDashboard(shopDomain, from, to)`

## Required env vars for sync
- `APP_ORG_ID`, `DATABASE_URL`, `CRYPTO_KEY_BASE64`
- `SHOPIFY_WEBHOOK_SECRET` (required for Shopify webhook validation; si no lo pones, se usa `SHOPIFY_API_SECRET`)
- `ALEGRA_WEBHOOK_SECRET` (optional, for signature validation)
  - Debug only: `ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS=true` (acepta webhooks sin firma incluso en production; no recomendado)

## Credential storage
- Shopify and Alegra credentials are stored encrypted in `credentials.data_encrypted`.
- Use the dashboard endpoint `PUT /api/settings` to save credentials.
  - Payload: `{ shopify: { shopDomain, accessToken, locationId, apiVersion }, alegra: { email, apiKey, warehouseId } }`

## Current limitations
- Mapping service uses Postgres (`sync_mappings`); apply migrations before running sync.

## Integration docs
- `docs/INTEGRACIONES-GAPS.md`
- `docs/SHOPIFY.md`
- `docs/ALEGRA.md`
- `docs/FLOWS.md`
- `docs/CONFIG.md`
