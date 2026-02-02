# Alegra: estado actual y gaps

## Implementado (segun el codigo)
### API (Basic Auth)
- Base URL por entorno: prod/sandbox via `getAlegraBaseUrl`.
- Operaciones en `src/connectors/alegra.ts`:
  - Items, contactos, facturas, pagos.
  - Inventario: ajustes y traslados.
  - Catalogos: bodegas, centros de costo, vendedores, metodos de pago, cuentas, listas de precio.
  - Resoluciones de factura.

### Webhooks
- Callback: `POST /api/webhooks/alegra`.
- Firma opcional: `X-Alegra-Signature` con `ALEGRA_WEBHOOK_SECRET`.
- Normaliza eventos:
  - `new-item` -> `item.created`
  - `update-item` -> `item.updated`
  - `inventory-update` -> `inventory.updated`
- Procesa items/inventario hacia Shopify (crear/actualizar producto, precio, inventario).

### Flujos activos
- Alegra -> Shopify (items/inventario):
  - Crear producto en Shopify o mapear por SKU/Barcode/Reference.
  - Actualizar precio, status y stock en Shopify.
  - Filtrado por bodegas y por estado activo.
  - Reglas: auto-publicacion, estado, solo activos, stock minimo.
- Inventario: job de ajustes (poll) que re-sincroniza stock por item.

## Gaps / faltantes
- No hay registro automatico de webhooks Alegra (debe hacerse externo).
- No hay flujo Alegra -> Shopify para facturas/pedidos.
- Sin documentacion formal de limites/rate limits y errores Alegra.
- Faltan docs de reglas de inventario y bodegas para operacion.

## Archivos clave
- Client: `src/connectors/alegra.ts`, `src/utils/alegra-env.ts`
- Webhooks: `src/api/webhooks.controller.ts`
- Sync: `src/services/alegra-to-shopify.service.ts`, `src/jobs/products-sync.ts`
- Inventario ajustes: `src/services/inventory-adjustments.service.ts`, `src/jobs/inventory-adjustments.ts`

