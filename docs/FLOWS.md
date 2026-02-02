# Flujos de integracion (Shopify <-> Alegra)

## 1) OAuth Shopify
- Inicio: `GET /api/auth/shopify?shop=...&storeName=...`
- Callback: `GET /api/auth/shopify/callback`
- Guarda token y tienda en `shopify_stores`.
- Registra webhooks automaticamente.

## 2) Shopify -> Alegra (Pedidos)
### Modos
- `db_only`: solo guarda en BD (orders/contacts).
- `contact_only`: crea/actualiza contacto en Alegra (sin factura).
- `invoice`: crea factura en Alegra.
- `off`: deshabilitado.

### Pasos (invoice)
- Crea/actualiza contacto en Alegra.
- Genera factura (si `generateInvoice` activo).
- Aplica pago si el pedido esta pagado y la configuracion lo permite.
- Ajuste de inventario y/o traslados (si aplica).
- Logs e idempotencia para evitar duplicados.

## 3) Alegra -> Shopify (Productos + Inventario)
### Disparadores
- Webhook Alegra: `item.created`, `item.updated`, `inventory.updated`.
- Batch sync desde job (poll) o backfill manual.

### Pasos
- Upsert en BD (tabla `products`).
- Resolver mapeo por SKU/Barcode/Reference.
- Crear producto base en Shopify si no existe.
- Actualizar precio y status (auto-publicacion).
- Actualizar inventario por `inventoryItemId` + `locationId`.

## 4) Inventario ajustes (Alegra -> Shopify)
- Poll de ajustes de inventario en Alegra.
- Re-sincroniza stock por item.
- Guarda checkpoint para continuar desde la ultima fecha.

## 5) Contactos (Shopify <-> Alegra)
- Sync manual por identificador.
- Sync masivo por batch.
- Match por prioridad (documento/telefono/email).

## 6) Backfills masivos
- Productos: `/api/backfill/products`
- Pedidos: `/api/backfill/orders`
- Controlados por reglas (solo activos/publicados, cache, etc).

