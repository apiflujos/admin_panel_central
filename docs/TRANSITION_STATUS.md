# Estado de Transición

## Branch actual

- Rama operativa: `client/olivashoes`
- Runtime restaurado y activo:
  - `src/server.ts`
  - `src/api/*`
  - `public/*`
- Frontend objetivo a mediano plazo:
  - `apps/admin-web`

## Verdad operativa actual

En esta branch, la superficie funcional que hoy preserva el producto es la legacy restaurada:

- login: `/login.html`
- app principal: `/dashboard`, `/settings/*`, `/__sa`
- API operativa: `/api/*`

`apps/admin-web` sigue existiendo y es el destino arquitectónico deseado, pero **todavía no tiene paridad funcional completa** para:

- conexiones
- toggles por tienda / overrides
- operaciones manuales
- facturación
- modales/wizards operativos
- branding dinámico completo

## Regla de transición

Hasta que exista paridad validada, se trabaja así:

1. La funcionalidad productiva se preserva en `src/server.ts + src/api + public`.
2. `apps/admin-web` se usa como superficie de portado controlado.
3. No se vuelve a retirar `public/*` ni `src/api/*` hasta cerrar smoke funcional completo.
4. Todo cambio de UI en `admin-web` debe copiar comportamiento real desde el legacy y seguir `Design System v4.html`.

## Orden de estandarización

### Fase P0

- mantener `app` legacy sano
- smoke funcional real:
  - login
  - conexiones
  - store-configs
  - operations
  - invoices
  - branding

### Fase P1

- portar a `apps/admin-web` por módulo, empezando por:
  1. auth shell
  2. settings / connections
  3. toggles / overrides
  4. operations
  5. invoices

### Fase P2

- cuando haya paridad real:
  - reintroducir backend separado objetivo
  - mover workers definitivamente
  - retirar legacy

## Criterio para retirar legacy

Solo se puede retirar `public/*` y el runtime Express cuando exista validación funcional de:

- conexiones Shopify / Alegra
- toggles por tienda
- webhooks y estado
- operaciones manuales
- facturas / PDF / retry / pagos
- branding ApiFlujos + cliente
- login y sesión sin regresiones
