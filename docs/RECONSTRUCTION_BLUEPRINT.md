# Blueprint de Reconstrucción Total

## Objetivo

Reconstruir el sistema en `main` para dejarlo con una arquitectura limpia, tipada y mantenible, enfocada en el núcleo del negocio:

- integración bidireccional `Alegra <-> Shopify`
- inventario
- precios
- pedidos
- facturación
- contactos
- webhooks
- jobs y reprocesos

## Principios no negociables

- No agregar más código legacy.
- No agregar fallbacks nuevos.
- No seguir extendiendo `public/app.js`.
- No dejar lógica de negocio en controllers.
- No mezclar frontend, API y workers en el mismo proceso objetivo.
- Todo contrato nuevo debe estar tipado y validado.
- Toda regla de negocio debe vivir fuera de la capa HTTP.

## Estado objetivo

```text
apps/
  admin-web/         -> Next.js + TypeScript
  integration-api/   -> API HTTP para auth, settings, sync, webhooks y operaciones
  workers/           -> cron, colas, reprocesos, backfills

packages/
  shared/            -> DTOs, schemas Zod, tipos compartidos, constants
  domain/            -> reglas puras de negocio y casos de uso
```

## Restricción de transición

La reconstrucción debe convivir temporalmente con la base actual sin romper:

- `npm run build`
- `npm start`
- migraciones existentes
- flujos productivos vigentes

Eso implica que la nueva arquitectura se monta en paralelo y luego reemplaza el legacy por fases.

En branches de cliente donde el runtime legacy haya sido reactivado para preservar producto, la prioridad inmediata es:

- mantener la superficie funcional real
- documentar la transición
- portar con paridad comprobada

No se asume que el cutover a `admin-web` ya esté cerrado solo porque exista el scaffolding.

## Módulos que sobreviven

- auth
- settings / conexiones
- products
- inventory
- orders
- invoices
- operations
- contacts
- logs
- modules / superadmin
- marketing solo si sigue siendo un objetivo de negocio vigente

## Módulos que salen del scope objetivo

- assistant
- cualquier fallback de credenciales legacy
- cualquier flujo ad hoc solo sostenido por scripts manuales

## Fase 0. Corte de deuda

### Objetivo

Congelar la expansión del sistema actual y preparar el terreno.

### Tareas

1. Marcar `assistant` como módulo de retiro.
2. Prohibir nuevos cambios sobre `public/app.js` salvo fixes críticos.
3. Inventariar rutas críticas y su ownership.
4. Identificar código legacy y puntos de fallback.
5. Definir matriz de reemplazo por módulo.

### Entregable

- backlog de retiro
- mapa de módulos
- lista de código bloqueado para nuevas extensiones

## Fase 1. Base de monorepo lógico

### Objetivo

Preparar la estructura física del nuevo sistema sin romper el runtime actual.

### Tareas

1. Crear `apps/admin-web`.
2. Crear `apps/integration-api`.
3. Crear `apps/workers`.
4. Crear `packages/shared`.
5. Crear `packages/domain`.
6. Documentar ownership por carpeta.

### Entregable

- estructura nueva versionada
- límites explícitos de responsabilidad

## Fase 2. Extracción del dominio

### Objetivo

Mover reglas del negocio fuera de controllers y servicios mezclados.

### Subdominios objetivo

- catalog
- inventory
- pricing
- orders
- invoices
- contacts
- mappings
- sync-runs
- retry-queue
- webhook-events

### Tareas

1. Extraer tipos canónicos.
2. Mover políticas de inventario y precio a `packages/domain`.
3. Mover matching Shopify/Alegra a `packages/domain`.
4. Reducir controllers a capa de orquestación.

### Entregable

- casos de uso puros
- reglas reutilizables
- menor acoplamiento HTTP/DB/API externa

## Fase 3. Contratos compartidos

### Objetivo

Blindar la comunicación entre frontend, API y workers.

### Tareas

1. Crear DTOs en `packages/shared`.
2. Crear schemas Zod para inputs y outputs críticos.
3. Estandarizar errores API.
4. Normalizar eventos de sync y webhook.

### Entregable

- contratos compartidos
- validación consistente
- base para frontend tipado

## Fase 4. Nuevo frontend

### Objetivo

Reemplazar el panel estático legacy con `Next.js + TypeScript`.

### Stack objetivo

- Next.js
- TypeScript strict
- React
- Zod
- capa de datos tipada

### Orden de migración

1. auth
2. dashboard
3. settings / conexiones
4. productos
5. pedidos / facturas
6. operaciones
7. logs / superadmin

### Regla

No se migra una pantalla sin contrato tipado previo.

## Fase 5. Workers

### Objetivo

Separar ejecución background del proceso web.

### Tareas

1. Mover pollers a `apps/workers`.
2. Mover cron a `apps/workers`.
3. Aislar retry queue.
4. Definir health checks por proceso.

### Entregable

- proceso web
- proceso workers
- responsabilidades claras

## Fase 6. Retiro definitivo del legacy

### Objetivo

Eliminar lo que ya no debe sobrevivir.

### Salidas esperadas

- retirar `public/app.js`
- retirar `public/index.html`
- retirar `public/styles.css`
- retirar fallbacks legacy
- retirar código de assistant
- retirar rutas y scripts no productivos

## Definición de éxito

El sistema se considera reconstruido cuando:

1. El frontend corre en `Next.js + TypeScript`.
2. La integración corre en API y workers separados.
3. El dominio central está fuera de controllers.
4. Los contratos están tipados y validados.
5. El legacy fue retirado, no maquillado.
6. El flujo bidireccional `Alegra <-> Shopify` queda como núcleo estable.
