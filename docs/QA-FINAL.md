# QA Final (Fase 6)

Objetivo: smoke test visual + funcional antes de cerrar el plan (incluye deploy en Render).

## Preflight (Render)
- Verifica que el servicio responde: `GET /health` → `{ "status": "ok" }`.
- Confirma que `APP_HOST` apunta a tu URL pública de Render.
- Confirma que `DATABASE_URL` y `DATABASE_SSL=true` están seteados.
- Confirma que existen `ADMIN_EMAIL` y `ADMIN_PASSWORD` (para entrar al dashboard y ejecutar acciones admin).

## Smoke test automático (recomendado)
Requiere un token QA (`QA_TOKEN`) o credenciales admin para login.

- Con token QA:
  - `BASE_URL=https://<tu-servicio>.onrender.com QA_TOKEN=<token> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke`
- Con admin email/password:
  - `BASE_URL=https://<tu-servicio>.onrender.com ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> SHOP_DOMAIN=<tu-tienda.myshopify.com> npm run qa:smoke`

Qué valida:
- `/health`
- `/api/profile` (auth)
- endpoints admin clave: `/api/settings`, `/api/connections`, `/api/store-configs`, `/api/shopify/webhooks/status`
- `/api/checkpoints/inventory-adjustments`, `/api/metrics`

## QA visual (UI)
- Desktop: cada módulo legible sin “scroll infinito”; acciones visibles; warnings no invasivos.
- Tablet: 2 columnas donde aplique; sin overflow horizontal.
- Móvil: 1 columna; botones a ancho completo; toggles alineados y clicables.
- Wizard:
  - “Configurar tienda (paso a paso)” muestra “Paso N/M”.
  - Salta pasos no aplicables (según modo de pedidos).
  - “Salir del asistente” deja la UI coherente (sin módulos raros abiertos).

## QA funcional (flujos)
En **Configuración** (admin):
- “Nueva conexión”: crear tienda + conectar Shopify/Alegra (según credenciales reales).
- “Webhooks”: crear → ver estado OK.
- “Cron global”: activar/desactivar y validar checkpoint.
- “Productos e inventario”: ejecutar una sincronización manual (si aplica).
- “Pedidos y facturación”: ejecutar sync / reintento de fallas / e‑Factura (si aplica).

## Cierre
- Si el smoke test pasa y los flujos funcionan, cerrar plan y preparar commit limpio (sin `.env`/`node_modules`).

