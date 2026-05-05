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

En esta branch, la superficie principal visible ya vive mayormente en `apps/admin-web`:

- login principal: `/auth/login`
- app principal: `/`, `/profile`, `/company`, `/users`, `/ai-assistants`
- settings principal: `/settings/connections`, `/settings/stores`, `/settings/marketing`
- super admin principal: `/superadmin`
- API operativa compartida: `/api/*`

El runtime legacy restaurado sigue preservando comportamiento y sirve como fallback explícito en:

- `/legacy/login`
- `/legacy/dashboard`
- `/legacy/settings/*`
- `/legacy/__sa`

`apps/admin-web` ya absorbió una parte grande del producto, pero **todavía no tiene paridad funcional completa** para:

- conexiones
- toggles por tienda / overrides
- operaciones manuales
- marketing-config fino por tienda
- modales/wizards operativos
- branding dinámico completo

Bloques ya absorbidos por `admin-web` dentro de `settings/connections`:

- reconnect/disconnect por proveedor
- webhooks Shopify
- store-configs críticos por tienda
- transfers y price lists
- defaults globales de factura avanzada (`/api/settings`)
  - incluye builder de observaciones
- marketing-config base por tienda:
  - pixel key / script
  - webhook URL
  - estado create/delete de marketing webhooks

Compatibilidad controlada aún visible desde `admin-web`:

- `sync-contacts`
  - congelado como compatibilidad controlada
- `sync-orders`
  - último candidato razonable si se abre otra fase de portado
- `products Shopify -> Alegra`
  - congelado como compatibilidad controlada por riesgo/combinatoria
- `inventory cron / checkpoint`
  - observable desde Next; ejecución sigue en fallback legacy

Estos bloques siguen viviendo en `/legacy/settings/connections`, pero ya quedaron explicitados en la superficie Next como remanentes controlados, no como huecos invisibles.

## Regla de transición

Hasta que exista paridad validada, se trabaja así:

1. La lógica productiva se sigue preservando en `src/server.ts + src/api + public`.
2. La superficie principal visible se prioriza en `apps/admin-web`.
3. `public/*` y el shell legacy solo se usan mediante `/legacy/*` o fallback explícito.
4. No se retira `src/api/*` ni `public/*` hasta cerrar smoke funcional completo.
5. Todo cambio de UI en `admin-web` debe copiar comportamiento real desde el legacy y seguir `Design System v4.html`.

## Orden de estandarización

### Fase P0

- mantener `app` legacy sano como fallback
- smoke funcional real sobre:
  - auth/login
  - conexiones
  - store-configs
  - operations
  - invoices
  - branding

### Fase P1

- consolidar `apps/admin-web` como superficie principal:
  1. auth shell
  2. settings / connections
  3. profile / company / users / ai-assistants
  4. toggles / overrides
  5. operations / invoices / marketing

### Fase P2

- cuando haya paridad real:
  - reducir `/legacy/*` al mínimo indispensable
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
