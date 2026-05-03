# Admin Central Platform

Starter scaffolding for the integration middleware and dashboard API.

## AI agents (required reading)

If you are an AI agent (Codex/Gemini/Claude/etc), **read these files before coding**:

- `AGENTS.md`
- `docs/DEPLOY.md`
- `docs/INTEGRATIONS.md`
- `docs/QA.md`
- `.env.example`
- `docs/RECONSTRUCTION_BLUEPRINT.md`
- `docs/RECONSTRUCTION_BACKLOG.md`
- `docs/TRANSITION_STATUS.md`

Before changing any code, **ask the human** if the change is for:

- `main` (base comun), or
- a specific client branch (`client/<cliente>`).

For frontend/UI work in `main`, use `Design System v4.html` as the visual source of truth. Reuse the canonical classes from that document (`.btn`, `.input`, `.pill`, `.page-header-standard`, `.page-toolbar`, `.dataTable`) before creating new patterns.

## Reconstrucción

La reconstrucción total del sistema en `main` se está guiando por:

- [docs/RECONSTRUCTION_BLUEPRINT.md](docs/RECONSTRUCTION_BLUEPRINT.md)
- [docs/RECONSTRUCTION_BACKLOG.md](docs/RECONSTRUCTION_BACKLOG.md)

Arquitectura objetivo:

- `apps/admin-web`
- `apps/integration-api`
- `apps/workers`
- `packages/shared`
- `packages/domain`

Frontend operativo:

- Arquitectura objetivo: `apps/admin-web`.
- Estado actual en `client/olivashoes`: la superficie funcional preservada sigue siendo `src/server.ts + public/* + src/api/*`.
- `apps/admin-web` permanece como destino de portado controlado, no como reemplazo ya cerrado.
- Ver estado de transición en `docs/TRANSITION_STATUS.md`.

## Quick start

1. Copy `.env.example` to `.env` and fill the values (use it as source of truth).
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

En `client/olivashoes`, el arranque operativo actual es el runtime legacy restaurado:

1. levantar backend (`npm run dev` o `docker compose up -d app`)
2. validar `GET /health`
3. acceder por `/login.html` o `/dashboard`

El cutover a una sola capa frontend con `admin-web` sigue pendiente de paridad funcional.

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

Orden recomendado de despliegue:

1. `npm ci`
2. `npm run build`
3. `npm run db:migrate`
4. reiniciar procesos (`pm2`, Docker o el supervisor que uses)
5. correr smoke:
   - backend: `npm run qa:smoke`
   - frontend nuevo: `npm run qa:admin-web`

El smoke visual debe ejecutarse únicamente contra `admin-web`.

## External datastores

- Postgres (principal): `DATABASE_URL` (required).
- Postgres (MIM): `MIM_DATABASE_URL` (optional, used when called).
- MongoDB: `MONGO_URL` (optional, used when called).
- Redis cache/queues: `REDIS_URL` (required; app fails to start if missing).

## Postgres pool (optional)

- `DB_POOL_MAX` (default: 5)
- `DB_POOL_IDLE_TIMEOUT_MS` (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS` (default: 5000)
- `DB_APP_NAME` (identificador visible en `pg_stat_activity`)

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
- Frontend nuevo (`admin-web`):
  - `BASE_URL=http://localhost:3100 ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> npm run qa:admin-web`

## Preparar inventario desde Excel

Para normalizar un Excel de inventario/precios y dejarlo listo para cruce con Shopify:

```bash
npm run inventory:prepare:xlsx -- "Actualizacion Precios e Inventarios 29abr26 (1).xlsx" --warehouse="Bodega Pagina Web"
```

Salida:

- `Descargas/preparados-shopify/<archivo>.prepared.json`
- `Descargas/preparados-shopify/<archivo>.prepared.csv`
- `Descargas/preparados-shopify/<archivo>.summary.json`

Notas:

- Usa por defecto la hoja `item`.
- Toma solo filas de variantes (`Nombre` con formato `Producto / Variante`).
- La columna base para match es `Referencia`.
- La bodega se puede cambiar con `--warehouse=<nombre>` o `XLSX_WAREHOUSE_NAME`.
- La implementacion operativa ya vive en `src/scripts/prepare-shopify-inventory-from-xlsx.ts` y `src/services/xlsx-inventory-preparation.service.ts`.

## Publicar inventario de Excel en Shopify

Para preparar el Excel, resolver match contra variantes de Shopify y actualizar inventario:

```bash
npm run inventory:publish:xlsx -- "Actualizacion Precios e Inventarios 29abr26 (1).xlsx" --warehouse="Bodega Pagina Web" --apply
```

Atajo mas simple, usando automaticamente el Excel mas reciente `Actualizacion Precios e Inventarios 29abr26*.xlsx`:

```bash
npm run inventory:publish:web
```

Sin aplicar cambios, para revisar el match primero:

```bash
npm run inventory:publish:xlsx -- "Actualizacion Precios e Inventarios 29abr26 (1).xlsx" --warehouse="Bodega Pagina Web"
```

Dry run simple:

```bash
npm run inventory:publish:web:dry
```

Notas:

- Si existen `SHOPIFY_DOMAIN` y `SHOPIFY_ACCESS_TOKEN`, el script usa esas credenciales.
- Si no existen, intenta leer la conexión Shopify guardada desde la BD usando `DATABASE_URL`, `APP_ORG_ID` y `CRYPTO_KEY_BASE64`.
- Si no se pasa `SHOPIFY_LOCATION_ID`, el script intenta resolver la ubicación principal en Shopify.
- Genera un reporte JSON en `Descargas/preparados-shopify/*.shopify-inventory-report.json`.
- La implementacion operativa ya vive en `src/scripts/publish-shopify-inventory-from-xlsx.ts` y `src/services/shopify-inventory-publication.service.ts`.

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
- En `client/olivashoes`, el branding operativo actual sigue sirviéndose también desde `public/`.
- `apps/admin-web` debe absorber ese comportamiento antes de retirar el legacy.
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
