# QA y smoke tests

## Preflight

- `GET /health` → `{ "status": "ok" }`.
- `APP_HOST` apunta a la URL publica.
- Si `admin-web` participa en la validación, `ADMIN_WEB_URL` debe apuntar al frontend nuevo.
- `DATABASE_URL` y `DATABASE_SSL=true` si aplica.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados.
- `REDIS_URL` presente.
- Rama correcta: `client/<cliente>`.
- Si aplica: `GET /api/modules` (super admin) y validar módulos activos del cliente.

## Smoke test automatico

Requiere `QA_TOKEN` o credenciales admin.

Con token QA:

```
BASE_URL=https://<tu-servicio>.onrender.com QA_TOKEN=<token> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke
```

Con admin email/password:

```
BASE_URL=https://<tu-servicio>.onrender.com ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke
```

Notas:

- `BASE_URL` puede ser igual a `APP_HOST` (default: `http://localhost:3006`).
- En `client/olivashoes`, el smoke base apunta al backend legacy restaurado (`app`), no a `admin-web`.
- `BASE_URL` debe apuntar a la superficie que estés validando:
  - backend legacy restaurado: `http://localhost:3006`
  - `admin-web`: `http://localhost:3100`
- `QA_TOKEN` es un Bearer token opcional generado con `POST /api/auth/token` (requiere login admin).

Valida:

- `/health`
- `/auth/login`
- páginas privadas principales sin sesión → redirección 3xx, nunca 500
  (`/settings/connections`, `/orders`, `/products`, `/contacts`)
- `/`
- `/api/profile`
- `/api/settings`, `/api/connections`, `/api/store-configs`, `/api/shopify/webhooks/status`
- `/api/checkpoints/inventory-adjustments`, `/api/metrics`
- compatibilidad legacy:
  - `/login.html`
  - `/dashboard`
- `/api/woocommerce/connections` (si WooCommerce está activo)

## Smoke test del frontend nuevo (`admin-web`)

Valida el árbol `Next.js + TypeScript` ya reconstruido.

Requiere:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `BASE_URL` apuntando al `admin-web` (default: `http://localhost:3100`)

Ejemplo:

```
BASE_URL=http://localhost:3100 ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> npm run qa:admin-web
```

Con Docker Compose local:

```
BASE_URL=http://localhost:3100 ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> npm run qa:admin-web
```

Valida:

- `/health` (en Becam, Express y Next comparten el mismo puerto)
- `/auth/login`
- login real por `/api/session/login`
- páginas privadas principales:
  - `/`
  - `/profile`
  - `/company`
  - `/users`
  - `/settings/connections`
  - `/settings/stores`
  - `/products`
  - `/orders`
  - `/contacts`
  - `/invoices`
- `/operations`
- `/superadmin`

## Regla de transición

Mientras `admin-web` no tenga paridad funcional completa, la aprobación de QA requiere:

1. smoke backend legacy restaurado
2. smoke visual/funcional del flujo crítico en navegador
3. smoke adicional de `admin-web` solo para el módulo que se esté portando

## QA visual (UI)

- Desktop: modulos legibles, sin scroll excesivo.
- Tablet: 2 columnas donde aplique; sin overflow horizontal.
- Movil: 1 columna; botones a ancho completo.

## QA funcional (flujos)

- Conexiones: Shopify/Alegra.
- Webhooks: crear y ver estado OK.
- Cron y checkpoints.
- Sync de productos/inventario y pedidos/facturacion (si aplica).

## Cierre

- Commit limpio (sin `.env`/`node_modules`).
