# Integraciones y flujos

## Nota para agentes IA (obligatorio)
- Antes de modificar código, preguntar si el cambio va en `main` o en `client/<cliente>`.
- Este repo se despliega **una instancia por cliente** (no multi‑cliente en runtime).

## Flujos principales
### 1) OAuth Shopify
- Inicio: `GET /api/auth/shopify?shop=...&storeName=...`
- Callback (redirect_uri): `GET /auth/callback`
- Alias: `GET /api/auth/shopify/callback`
- Guarda token/tienda en `shopify_stores` y registra webhooks.
- Requiere `APP_HOST` (URL pública base con esquema).

### 2) Shopify -> Alegra (Pedidos)
Modos:
- `db_only`: solo guarda en BD.
- `contact_only`: crea/actualiza contacto en Alegra.
- `invoice`: crea factura en Alegra.
- `off`: deshabilitado.

Flujo (invoice):
- Upsert contacto en Alegra.
- Genera factura si `generateInvoice`.
- Aplica pago si corresponde.
- Ajuste de inventario/traslados (si aplica).
- Logs + idempotencia.

### 3) Alegra -> Shopify (Productos/Inventario)
- Webhooks Alegra + jobs de polling/backfill.
- Upsert en `products`.
- Mapeo por SKU/Barcode/Reference.
- Crea producto base en Shopify si no existe.
- Actualiza precio/estado/stock.

### 4) Ajustes de inventario (Alegra -> Shopify)
- Poll de ajustes en Alegra.
- Re‑sync por item con checkpoints.

### 5) Contactos (Shopify <-> Alegra)
- Sync manual o batch.
- Match por prioridad (documento/telefono/email).

## Shopify (estado actual)
Implementado:
- OAuth con HMAC y validación de dominio.
- Webhooks (firma con `SHOPIFY_WEBHOOK_SECRET`).
- Admin API (GraphQL): orders, customers, products, inventory, webhooks.
- Sync de pedidos (Shopify -> Alegra).

Gaps conocidos:
- `inventory_levels/update` y `products/update` no ejecutan sync real.
- Sin documentación formal de rate limits/errores.
- Sin guía de multi‑tienda en docs.

Archivos clave:
- `src/api/shopify-oauth.controller.ts`
- `src/api/shopify-webhooks.controller.ts`
- `src/connectors/shopify.ts`
- `src/services/shopify-to-alegra.service.ts`

## Alegra (estado actual)
Implementado:
- API (Basic Auth) para items/contactos/facturas/pagos/inventario.
- Webhooks Alegra hacia Shopify.
- Sync de items/inventario hacia Shopify.

Gaps conocidos:
- Webhooks Alegra no se registran automáticamente.
- Sin docs formales de limites/errores.

Archivos clave:
- `src/connectors/alegra.ts`
- `src/api/webhooks.controller.ts`
- `src/services/alegra-to-shopify.service.ts`

## WooCommerce (en preparación)
- Endpoints de conexión ya existen:
  - `GET /api/woocommerce/connections`
  - `POST /api/woocommerce/connections`
  - `DELETE /api/woocommerce/connections/:shopDomain`
- Aún **no** hay flujos de pedidos/stock activos (solo conexión guardada).

## Marketing & Analytics
- Webhooks (HMAC): `POST /api/marketing/webhooks/shopify`
- Pixel:
  - Script: `GET /api/marketing/pixel.js?key=...`
  - Collector: `POST /api/marketing/collect?key=...`
- Sync/backfill:
  - `POST /api/marketing/sync/orders`
  - `POST /api/marketing/metrics/recompute`
- Dashboard/insights:
  - `GET /api/marketing/dashboard`
  - `GET /api/marketing/insights`
  - `POST /api/marketing/graphql`

### OAuth Ads (configuracion)
- Google Ads:
  - `GET /api/auth/google-ads/start`
  - `GET /api/auth/google-ads/callback`
  - `GET /api/auth/google-ads/status`
- Meta Ads:
  - `GET /api/auth/meta-ads/start`
  - `GET /api/auth/meta-ads/callback`
  - `GET /api/auth/meta-ads/status`
- TikTok Ads:
  - `GET /api/auth/tiktok-ads/start`
  - `GET /api/auth/tiktok-ads/callback`
  - `GET /api/auth/tiktok-ads/status`

## Configuracion: global vs por tienda
### Global (settings)
Guardado en `credentials.data_encrypted` y tablas de reglas.

Shopify:
- `shopDomain`, `accessToken`, `locationId`, `apiVersion`.

Alegra:
- `email`, `apiKey`, `environment`.

Reglas globales (inventario):
- `publishOnStock`, `onlyActiveItems`
- `autoPublishOnWebhook`, `autoPublishStatus`
- `inventoryAdjustmentsEnabled`, `inventoryAdjustmentsIntervalMinutes`
- `inventoryAdjustmentsAutoPublish`, `warehouseIds`

Facturacion global:
- `generateInvoice`
- `resolutionId`, `warehouseId`, `costCenterId`, `sellerId`
- `paymentMethod`, `bankAccountId`, `applyPayment`
- `observationsTemplate`, `einvoiceEnabled`

### Por tienda (store-configs)
Guardado en `shopify_store_configs.config_json`.

Transferencias:
- `enabled`, `destinationWarehouseId`, `originWarehouseIds`, `priorityWarehouseId`
- `strategy` (`manual|consolidation|priority|max_stock`)
- `fallbackStrategy`, `tieBreakRule`, `splitEnabled`, `minStock`

Listas de precio:
- `generalId`, `discountId`, `wholesaleId`, `currency`

Overrides por tienda:
- Mismas reglas globales (incluye `syncEnabled`).
- Mismas reglas de facturacion.

Sync por tienda:
- `sync.contacts.fromShopify`
- `sync.contacts.fromAlegra`
- `sync.contacts.matchPriority`
- `sync.orders.shopifyToAlegra` (`db_only|contact_only|invoice|off`)
- `sync.orders.alegraToShopify` (`draft|active|off`)

Notas:
- Si no hay override, se usan valores globales.
- `syncEnabled` bloquea envio a Shopify pero permite guardar en BD.

## Identidad y branding
- El logo de **ApiFlujos** siempre se muestra como marca principal.
- El cliente puede configurar su logo y nombre en `Perfil empresa`:
  - `GET/PUT /api/company`
  - `GET /api/company/public` (publico)
- El logo del cliente se muestra junto al de ApiFlujos (no lo reemplaza).
- Identidad base (por branch): `public/brand.json` define títulos y textos antes de conectar servicios.

## API (mapa rapido por grupos)
Autenticación:
- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/csrf`, `GET /api/auth/me`
- `POST /api/auth/password`, `POST /api/auth/token`

Conexiones/configuración:
- `GET/POST /api/connections`, `DELETE /api/connections/:id`
- `GET/PUT /api/settings`
- `GET/PUT /api/store-configs/:shopDomain`

Productos/Inventario:
- `GET /api/products`, `GET /api/alegra/items`
- `POST /api/sync/products`, `POST /api/sync/inventory-adjustments`

Pedidos/Operación:
- `GET /api/orders`, `GET /api/invoices`
- `POST /api/sync/orders`, `POST /api/sync/invoices`
- `GET /api/operations`, `POST /api/operations/:orderId/sync`

Logs & métricas:
- `GET /api/logs`, `POST /api/logs/retry`
- `GET /api/metrics`, `GET /api/reports/commerce.csv`

Usuarios/empresa:
- `GET/PUT /api/profile`
- `GET/PUT /api/company`
- `GET/POST/PUT/DELETE /api/users`
- `GET /api/modules` (modulos activos por instancia)

Assistant:
- `POST /api/assistant/query`
- `POST /api/assistant/execute`

Super admin (global):
- prefijo `/api/sa/*` (planes, módulos, límites, uso)
- Gestión de super admins ApiFlujos: `GET/POST/PUT/DELETE /api/sa/users`
- Auditoría de super admins: `sync_logs` con `entity=super_admin_user`, `direction=sa`

### Módulos / conexiones habilitables (por instancia)
El panel Super Admin puede activar/desactivar servicios por cliente. Claves base:
- `shopify`, `woocommerce`, `alegra`
- `google_ads`, `meta_ads`, `tiktok_ads`
- `chatwoot`, `mim`, `ia`, `envioclick`, `envia`

Si un módulo está desactivado:
- No se permite crear conexiones nuevas de ese servicio.
- La UI muestra el bloque deshabilitado.

## Roadmap
- Integrar WooCommerce y otras fuentes de pedidos.
