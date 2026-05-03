# Plan de Estandarización — `client/olivashoes`

## Objetivo

Estandarizar el sistema hacia la arquitectura objetivo (`apps/admin-web` + servicios compartidos) **sin perder** la funcionalidad productiva ya recuperada en:

- `src/server.ts`
- `src/api/*`
- `public/*`

## Principio operativo

En esta branch, el legacy restaurado es la fuente de verdad funcional.  
`apps/admin-web` se trata como superficie de portado controlado.

No se retira nada de `public/*` ni `src/api/*` hasta cerrar paridad validada.

## Estado actual

### Superficie funcional viva

- login: `/login.html`
- dashboard/settings/superadmin: renderizados por `src/server.ts`
- API productiva: `src/api/routes.ts`
- UX operativa real:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`

### Superficie objetivo parcial

- `apps/admin-web/app/settings/connections/page.tsx`
- `apps/admin-web/components/settings-connections-page.tsx`
- `apps/admin-web/components/settings-connections-page-content.tsx`
- `apps/admin-web/lib/api.ts`
- `apps/admin-web/lib/server-api.ts`

Hoy esa capa solo cubre un resumen de conexiones, no el flujo operativo completo.

## Gap principal detectado

## `settings/connections`

### Legacy sí tiene

- wizard de creación/conexión por tienda
- agrupación por dominio funcional:
  - commerce
  - accounting
  - ads
- conexión Shopify por OAuth o token
- conexión WooCommerce por key/secret
- asociación de cuenta Alegra por tienda
- reconnect/disconnect por proveedor
- selección de tienda activa
- cards de tiendas conectadas
- webhooks Shopify create/delete/status
- estado de Ads:
  - Google
  - Meta
  - TikTok
- marketing config:
  - pixel
  - webhook URL
  - create webhooks
- copy config entre tiendas
- conexión y validaciones acopladas al estado real de la tienda activa

### `admin-web` hoy solo tiene

- cards resumen
- modal de detalle
- overview superficial
- lectura server-side de estado

No tiene:

- create/reconnect/disconnect
- wizard
- store-scoping real
- webhooks ops
- ads credentials flow
- marketing config flow
- toggle/overrides relacionados con la tienda

## Archivos legacy a usar como donantes funcionales

### Estructura / HTML

- `public/index.html`

Bloques clave:

- módulo de conexiones
- panel de tiendas conectadas
- tienda activa
- configuraciones por tienda

### Comportamiento

- `public/app.js`

Funciones y zonas críticas:

- `loadConnections`
- `renderConnections`
- `renderStoreActiveSelect`
- `updateConnectionPills`
- `createShopifyWebhooks`
- `deleteShopifyWebhooks`
- flujos `connect-*`
- modal/wizard de conexiones
- copy config y tienda activa

### Estilos

- `public/styles.css`

Bloques clave:

- `.connections-group`
- `.connections-module-grid`
- `.connection-block`
- `.connection-modal*`
- `.settings-pane[data-settings-pane="connections"]`

## Archivos objetivo para portado

- `apps/admin-web/app/settings/connections/page.tsx`
- `apps/admin-web/components/settings-connections-page.tsx`
- `apps/admin-web/components/settings-connections-page-content.tsx`
- `apps/admin-web/lib/api.ts`
- `apps/admin-web/lib/server-api.ts`
- `apps/admin-web/styles/components.css`
- `apps/admin-web/styles/layout.css`
- `apps/admin-web/styles/tokens.css`

## Fases de portado seguro

## Fase 1 — Paridad de lectura real

Objetivo:

- hacer que `admin-web` muestre la misma estructura conceptual del legacy sin modificar todavía la operación crítica

Entregables:

- grupos visuales:
  - commerce
  - accounting
  - ads
- cards/tiles por proveedor con estado real
- tienda activa visible
- tiendas conectadas visibles
- branding secundario visible si existe

Sin tocar aún:

- create/reconnect/disconnect
- save credentials
- webhooks create/delete

## Fase 2 — Operación de conexiones

Objetivo:

- portar acciones mutativas del módulo de conexiones

Orden:

1. seleccionar tienda activa
2. reconnect/disconnect Shopify/Alegra/Woo
3. alta de tienda
4. asociación de Alegra
5. webhooks Shopify status/create/delete

APIs existentes a reutilizar:

- `GET/POST /api/connections`
- `DELETE /api/connections/domain/:shopDomain`
- `DELETE /api/connections/:id`
- `DELETE /api/connections/alegra/:storeId`
- `GET/POST /api/woocommerce/connections`
- `DELETE /api/woocommerce/connections/:shopDomain`
- `GET /api/shopify/webhooks/status`
- `POST /api/shopify/webhooks`
- `POST /api/shopify/webhooks/delete`
- `GET/POST /api/stores`
- `DELETE /api/stores/:id`

## Fase 3 — Toggles y overrides por tienda

Objetivo:

- portar la operación real de `store-configs`

Orden:

1. tienda activa
2. carga de config actual
3. save config por tienda
4. toggles de sync
5. toggles de factura
6. validaciones de dependencias
7. copy config entre tiendas

APIs críticas:

- `GET /api/store-configs`
- `PUT /api/store-configs/:storeKey`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/settings/test`

## Fase 4 — Operaciones y facturación

Objetivo:

- llevar a `admin-web` los flujos que hoy están vivos pero siguen dependiendo del legacy

Orden:

1. operaciones manuales
2. retry invoice
3. emitir pago
4. anular
5. PDF invoice
6. e-invoice override

APIs críticas:

- `GET /api/operations`
- `POST /api/operations/:orderId/sync`
- `POST /api/operations/:orderId/retry-invoice`
- `POST /api/operations/:invoiceId/emit-payment`
- `POST /api/operations/:invoiceId/void`
- `GET /api/invoices`
- `GET /api/invoices/:invoiceId/pdf`

## Fase 5 — Branding y shell final

Objetivo:

- mover la experiencia visual final sin perder la identidad ya recuperada

Entregables:

- ApiFlujos siempre visible
- logo del cliente secundario
- topbar/perfil/empresa
- navegación y shell alineados con `Design System v4.html`

## Regla de salida por fase

Cada fase solo se considera cerrada si:

1. el legacy sigue funcionando
2. el módulo nuevo en `admin-web` pasa smoke
3. no aparecen regresiones en:
   - conexiones
   - toggles
   - operaciones
   - facturas
   - branding

## Smoke mínimo por módulo portado

### Connections

- listar conexiones
- cambiar tienda activa
- reconnect Shopify
- reconnect Alegra
- create/delete webhooks
- disconnect proveedor

### Store configs

- cargar config por tienda
- guardar config
- cambiar toggles
- validar persistencia
- copy config

### Operations / Invoices

- listar
- ejecutar acción
- validar resultado
- descargar PDF

## Qué no hacer

- no volver a retirar `public/*`
- no cambiar redirects globales a `admin-web` todavía
- no duplicar lógica de negocio en React
- no inventar contratos nuevos si ya existe un endpoint operativo válido

## Próximo objetivo concreto

Primer portado real recomendado:

1. reconstruir `settings/connections` en `apps/admin-web` con estructura por grupos y tienda activa
2. dejarlo inicialmente en modo lectura real
3. luego abrir acciones mutativas una por una
