# Admin Central Platform

Starter scaffolding for the integration middleware and dashboard API.

## AI agents (required reading)
If you are an AI agent (Codex/Gemini/Claude/etc), **read these files before coding**:
- `AGENTS.md`
- `docs/DEPLOY.md`
- `docs/INTEGRATIONS.md`
- `docs/QA.md`
- `.env.example`

Before changing any code, **ask the human** if the change is for:
- `main` (base comun), or
- a specific client branch (`client/<cliente>`).

## Quick start
1) Copy `.env.example` to `.env` and fill the values (use it as source of truth).
2) Install dependencies: `npm install`
3) Run dev server: `npm run dev`

## Deploy (Render)
- Blueprint: `render.yaml` (web + Postgres).
- Health check: `GET /health`
- Important env vars to set in Render:
  - `APP_HOST`: base URL (ej: `https://<tu-servicio>.onrender.com` o tu dominio, incluye esquema)
  - `APP_PORT` (puerto de la app)
  - `CRYPTO_KEY_BASE64`: 32 bytes en base64 (no lo cambies si ya tienes credenciales cifradas en la BD)
    - Generar (una sola vez): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  - `DATABASE_SSL=true` (si usas Postgres de Render)
  - `REDIS_URL` (obligatorio)

## Database migrations
- After filling `.env`, run:
  - Prod/CI: `npm run build && npm run db:migrate`
  - Local: `npm run db:migrate:dev`
- Migrations are tracked in `schema_migrations`.
- The app does not auto-apply schema changes at runtime.

## External datastores
- Postgres (principal): `DATABASE_URL` (required).
- Postgres (MIM): `MIM_DATABASE_URL` (optional, used when called).
- MongoDB: `MONGO_URL` (optional, used when called).
- Redis cache/queues: `REDIS_URL` (required; app fails to start if missing).

## Public files / uploads
- Folder: `public/data/`
- Se usa para archivos que el cliente sube o consume vía rutas públicas.
- El contenido se ignora en Git (`public/data/*`), solo se versiona la carpeta.

### MIM Postgres + MongoDB (sin migraciones)
- **No se ejecutan migraciones** sobre MIM ni Mongo. Se asume que **las estructuras ya existen**.
- Uso previsto: **consultas** y **ediciones puntuales** sobre datos existentes (ej: aprobaciones).
- Cuando se creen modelos/servicios para estas conexiones, deben:
  - Evitar `CREATE/ALTER/DROP`.
  - Documentar claramente qué tablas/colecciones se leen o actualizan.

## Per-client database naming
- Base DB name pattern: `admin-central-<CLIENTE>`
- For each cliente:
  - Create a Postgres DB named `admin-central-<CLIENTE>`.
  - Point the service env var `DATABASE_URL` to that DB.
  - Keep `APP_ORG_ID` consistent with the tenant record if you use it.

## QA (smoke)
- Checklist: `docs/QA.md`
- Script (requiere `QA_TOKEN` o `ADMIN_EMAIL`/`ADMIN_PASSWORD`):
  - `BASE_URL=https://<tu-servicio>.onrender.com QA_TOKEN=<token> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke`

## Notes
- Webhook endpoint: `POST /api/webhooks/shopify`
- Webhook endpoint: `POST /api/webhooks/alegra`
- Mass sync (Alegra → Shopify): `POST /api/sync/invoices` (crea pedidos/borradores desde facturas Alegra)
- Shopify client uses GraphQL Admin API (see `src/connectors/shopify.ts`)
- Health check: `GET /health`
- Health check (DB): `GET /health/db`
- Schema migrations live in `src/db/migrations/`.
- Roadmap: integrar WooCommerce y otras fuentes de pedidos más adelante (ver `docs/INTEGRATIONS.md`).
- `APP_HOST` es la única URL pública usada por OAuth y webhooks.
- Branding: ApiFlujos siempre visible; el cliente puede configurar su logo en `Perfil empresa`.
- Branding por cliente: textos/títulos se ajustan en `public/brand.json` (por branch).
- Super Admin (ApiFlujos): grupo de usuarios con acceso global. Se gestionan en `Super Admin > Usuarios ApiFlujos` (`/api/sa/users`).
- Solo super admin ApiFlujos puede asignar/cambiar roles de usuarios.

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
- `docs/INTEGRATIONS.md`
- `docs/DEPLOY.md`
- `docs/QA.md`
