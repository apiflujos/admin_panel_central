# Plan de Demolición del Legacy

## Objetivo

Eliminar la convivencia de dos capas frontend y dejar una sola entrada operativa:

- `apps/admin-web` como único frontend
- `apps/integration-api` como único backend HTTP
- `apps/workers` como único runtime de jobs

## Estado actual

Todavía conviven:

- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `apps/admin-web`

Eso implica duplicación visual y confusión de ownership.

## Corte propuesto

### Fase A. Cutover de entrada

1. desplegar `apps/admin-web`
2. activar:
   - `ADMIN_WEB_URL=https://<frontend>`
3. validar redirects desde backend

Resultado:

- `public/` deja de ser la entrada principal
- el backend deja de servir la SPA legacy

### Fase B. Paridad mínima

Antes de borrar `public/`, el frontend nuevo debe cubrir:

- dashboard / métricas
- settings / conexiones
- products
- orders
- invoices
- contacts
- marketing
- operations
- logs
- superadmin

### Fase C. Retiro físico

Cuando la paridad esté cerrada:

1. eliminar rutas que renderizan `public/index.html`
2. eliminar `public/app.js`
3. eliminar `public/styles.css`
4. eliminar HTML legacy residual

Estado actual:

- corte lógico del backend `completado`
- eliminación física de la SPA legacy en `public/` **`pendiente`** — los archivos siguen presentes y se sirven bajo `/legacy/*` como fallback controlado mientras se valida paridad total con `apps/admin-web` (ver `TRANSITION_STATUS.md`). Programar la baja cuando `apps/admin-web` cubra 100% de las operaciones observadas y no queden llamadas activas al controller `src/api/assistant.controller.ts` desde `public/app.js`.

## Criterio de terminado

La demolición queda cerrada cuando:

1. ninguna ruta operativa depende de `public/index.html`
2. el backend no sirve assets de la SPA legacy
3. toda navegación visible entra por `apps/admin-web`
4. `public/` deja de contener UI operativa
