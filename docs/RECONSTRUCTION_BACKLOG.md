# Backlog Maestro de Reconstrucción

## Sprint 0

### Prioridad P0

- Retirar `assistant` del target architecture. `completado`
- Congelar expansión de `public/app.js`.
- Catalogar fallbacks legacy de credenciales y conexiones.
- Listar endpoints críticos que se preservan en la transición.
- Crear estructura `apps/` y `packages/`.

### Criterio de terminado

- Blueprint aprobado y versionado.
- Scaffolding nuevo creado.
- Scope del legacy documentado.

## Sprint 1

### Prioridad P0

- Crear `packages/shared` con tipos base. `completado`
- Crear `packages/domain` con módulos:
  - inventory `completado`
  - pricing `completado`
  - matching `completado`
  - alegra `completado`
  - shopify-product-sync `completado`
  - xlsx-inventory `completado`
  - shopify-publication `completado`
- Crear contrato base de producto, variante, inventario y precio. `completado`
- Extraer reglas de inventario Shopify desde controllers/services actuales. `parcial`
- Migrar CLI de preparacion/publicacion de inventario desde `scripts/*.js` a `src/scripts/*.ts`. `completado`
- Retirar el uso operativo de `scripts/prepare-shopify-inventory-from-xlsx.js` y `scripts/publish-shopify-inventory-from-xlsx.js`. `completado`

### Criterio de terminado

- primeras reglas compartidas fuera del runtime legacy `cumplido`
- tests unitarios nuevos en dominio `cumplido`
- flujo operativo de inventario/precio sin depender de CLI JS legacy `cumplido`
- pendiente menor de cierre: conectar mas servicios HTTP al dominio extraido antes de abrir Sprint 2

## Sprint 2

### Prioridad P0

- Crear `apps/integration-api` como destino del backend nuevo. `completado`
- Definir layout de módulos:
  - auth `completado`
  - settings `completado`
  - sync `completado`
  - webhooks `completado`
  - operations `completado`
- Crear `apps/workers` como destino de pollers y cron. `completado`
- Extraer bootstrap HTTP desde `src/server.ts` a un factory reusable. `completado`
- Extraer bootstrap de jobs/pollers desde `src/server.ts` a runtime reusable. `completado`
- Crear entrypoints ejecutables para `apps/integration-api` y `apps/workers`. `completado`
- Crear manifests y adapters iniciales para módulos de `apps/integration-api`. `completado`
- Crear wrappers y runtime indexado en `apps/workers`. `completado`
- Mover el ensamblaje del router API desde `src/api/routes.ts` a `apps/integration-api` y retirar el bridge muerto. `completado`
- Migrar primeros handlers críticos al árbol nuevo de `apps/integration-api` (webhooks core, auth core, logs core). `completado`
- Drenar `sync` fuera de `src/api/*` hasta dejar solo bridges. `completado`
- Drenar `src/jobs/*` hasta dejar solo bridges hacia `apps/workers`. `completado`

### Criterio de terminado

- estructura de API nueva
- estructura de workers nueva
- límites de responsabilidad claros
- `sync` sin controllers legacy activos
- `src/api/*` y `src/jobs/*` usados como compatibilidad, no como runtime primario

## Sprint 3

### Prioridad P0

- Crear `apps/admin-web` con Next.js + TypeScript. `en progreso`
- Definir layout base:
  - auth `en progreso`
  - app shell `completado`
  - dashboard `en progreso`
  - settings `en progreso`
  - contacts `en progreso`
  - invoices `en progreso`
  - marketing `en progreso`
  - products `en progreso`
  - orders `en progreso`
  - operations `en progreso`
  - logs `en progreso`
  - superadmin `en progreso`
- Integrar `Design System v4` como fuente visual. `en progreso`
- Crear package y scripts de ejecución de `apps/admin-web`. `completado`
- Crear componentes reutilizables base del DS v4 en `apps/admin-web`. `completado`
- Exponer primeros endpoints tipados para `admin-web` desde `integration-api`. `completado`
- Encadenar login/logout y lectura de sesión real desde `admin-web` hacia `integration-api`. `completado`

### Criterio de terminado

- frontend nuevo arranca
- shell nuevo existe sin depender del HTML legacy

## Sprint 4+

- migración módulo por módulo
- retiro de código legacy
- eliminación física del frontend legacy en `public/` `completado`
- cierre de workers
- endurecimiento de CI/CD
- smoke test específico de `admin-web` y healthcheck propio `completado`
- hard cut del backend para dejar de servir `public/` y redirigir solo a `admin-web` `completado`

## Nota de transición para branches de cliente

En `client/olivashoes`, esos cierres no deben considerarse válidos hasta revalidar paridad funcional completa. El frontend legacy y el runtime Express fueron reactivados para recuperar:

- conexiones
- toggles
- operaciones
- facturación
- branding

El backlog de estandarización en esa branch debe seguir:

1. preservar producto
2. portar por módulo a `apps/admin-web`
3. retirar legacy solo al final
