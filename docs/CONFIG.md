# Configuracion: global vs por tienda

## 1) Global (settings)
Guardado en `credentials.data_encrypted` y tablas de reglas.

### Shopify (global)
- `shopDomain`, `accessToken`, `locationId`, `apiVersion`.
- En UI se usa como fallback si no hay store configurada.

### Alegra (global)
- `email`, `apiKey`, `environment`.

### Reglas globales (inventario)
- `publishOnStock`
- `onlyActiveItems`
- `autoPublishOnWebhook`
- `autoPublishStatus` (`draft|active`)
- `inventoryAdjustmentsEnabled`
- `inventoryAdjustmentsIntervalMinutes`
- `inventoryAdjustmentsAutoPublish`
- `warehouseIds`

### Facturacion global
- `generateInvoice`
- `resolutionId`, `warehouseId`, `costCenterId`, `sellerId`
- `paymentMethod`, `bankAccountId`, `applyPayment`
- `observationsTemplate`
- `einvoiceEnabled`

## 2) Por tienda (store-configs)
Guardado en `shopify_store_configs.config_json`.

### Transferencias (logistica)
- `enabled`
- `destinationWarehouseId`
- `originWarehouseIds`
- `priorityWarehouseId`
- `strategy` (`manual|consolidation|priority|max_stock`)
- `fallbackStrategy`
- `tieBreakRule` (`priority|max_stock|random`)
- `splitEnabled`
- `minStock`

### Listas de precio
- `generalId`, `discountId`, `wholesaleId`, `currency`

### Reglas por tienda (override)
- Mismas de reglas globales (incluye `syncEnabled`).

### Facturacion por tienda (override)
- Mismas de facturacion global.

### Sync por tienda
- `sync.contacts.fromShopify`
- `sync.contacts.fromAlegra`
- `sync.contacts.matchPriority`
- `sync.orders.shopifyToAlegra` (`db_only|contact_only|invoice|off`)
- `sync.orders.alegraToShopify` (`draft|active|off`)

## 3) Notas
- Si no existe override por tienda, se usan valores globales.
- `syncEnabled` bloquea envio a Shopify pero permite guardar en BD.

