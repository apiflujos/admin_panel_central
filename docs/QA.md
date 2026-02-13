# QA y smoke tests

## Preflight
- `GET /health` → `{ "status": "ok" }`.
- `APP_HOST` apunta a la URL publica.
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
- `BASE_URL` puede ser igual a `APP_HOST` (default: `http://localhost:10000`).
- `QA_TOKEN` es un Bearer token opcional generado con `POST /api/auth/token` (requiere login admin).

Valida:
- `/health`
- `/api/profile`
- `/api/settings`, `/api/connections`, `/api/store-configs`, `/api/shopify/webhooks/status`
- `/api/checkpoints/inventory-adjustments`, `/api/metrics`
- `/api/woocommerce/connections` (si WooCommerce está activo)

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
