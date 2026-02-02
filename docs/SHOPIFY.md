# Shopify: estado actual y gaps

## Implementado (segun el codigo)
### OAuth
- Endpoints: `GET /api/auth/shopify` y `GET /api/auth/shopify/callback`.
- Validaciones: dominio `*.myshopify.com`, HMAC en callback.
- Guarda store + token en `shopify_stores`.
- Registro automatico de webhooks tras OAuth.
- Env requeridos: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`, `APP_HOST`.

### Webhooks
- Callback: `POST /api/webhooks/shopify`.
- Verificacion: `X-Shopify-Hmac-Sha256` con `SHOPIFY_WEBHOOK_SECRET`.
- Si `SHOPIFY_WEBHOOK_SECRET` no existe, acepta la firma.
- Topics registrados (GraphQL): `ORDERS_CREATE`, `ORDERS_UPDATED`, `ORDERS_PAID`, `REFUNDS_CREATE`, `INVENTORY_LEVELS_UPDATE`, `PRODUCTS_UPDATE`.
- Gestion: crear, borrar y ver estado en `/api/shopify/webhooks*`.

### Admin API (GraphQL)
Operaciones en `src/connectors/shopify.ts`:
- Orders: listar por query, listar por actualizacion, obtener por id.
- Customers: buscar, crear, actualizar, obtener por id.
- Products: listar, obtener por id, crear producto base, actualizar estado.
- Inventario: ajustar/set on hand por `inventoryItemId` y `locationId`.
- Webhooks: create/list/delete.
- Tags de pedido: add tag.

### Flujos activos
- Shopify -> Alegra (orders):
  - modos: `db_only`, `contact_only`, `invoice`, `off`.
  - crea/actualiza contacto en Alegra.
  - crea factura en Alegra (si aplica) + pagos + ajustes de inventario.
  - soporta overrides de factura por tienda.
- Sync batch de orders (polling).

## Gaps / faltantes
- Webhooks Shopify `inventory_levels/update` y `products/update` no ejecutan sync real (TODO).
- No hay flujo Shopify -> Alegra para catalogos/variantes/productos (solo pedidos).
- Sin documentacion de limites/rate limit ni manejo de errores de GraphQL.
- No hay guia de multi-tienda (scope/instalacion/rotacion de tokens) en docs.

## Archivos clave
- OAuth: `src/api/shopify-oauth.controller.ts`, `src/services/shopify-oauth.service.ts`
- Webhooks: `src/api/shopify-webhooks.controller.ts`, `src/api/webhooks.controller.ts`
- Client: `src/connectors/shopify.ts`
- Sync: `src/services/shopify-to-alegra.service.ts`, `src/jobs/orders-sync.ts`

