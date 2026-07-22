## Limpieza de precios y promociones Shopify

Fecha: `2026-05-08`
Branch: `client/olivashoes`
Shop: `7aad0c-d7.myshopify.com`

### Cambio de código aplicado

- El flujo `Alegra -> Shopify` ahora calcula precio final con IVA.
- Si Alegra tiene descuento activo:
  - `price` = precio con descuento
  - `compareAtPrice` = precio oficial
- Si Alegra ya no tiene descuento:
  - `price` = precio oficial
  - `compareAtPrice` = `null`

Archivos:

- `src/api/products.controller.ts`
- `src/connectors/shopify.ts`
- `src/services/alegra-to-shopify.service.ts`
- `docs/INTEGRATIONS.md`

### Ejecución operativa

- Variantes Shopify analizadas: `8920`
- Variantes Shopify con match contra Alegra: `2007`
- Variantes desalineadas corregidas: `2004`
- Productos/variants con fallo final de negocio: `0`

### Reintentos

La corrida masiva terminó con `2` fallos transitorios de red (`fetch failed`):

- `gid://shopify/Product/9830117736688`
- `gid://shopify/Product/9830271910128`

Ambos se reintentaron de forma puntual y quedaron aplicados sin `userErrors`.

### Verificación puntual

Se verificaron muestras en Shopify después del ajuste:

- `PAJXC0026` (`AGATA - DORADO`) quedó en:
  - `price = 180000.01`
  - `compareAtPrice = 360000.00`
- `PMZOC0034` (`AGNA - LEOPARDO`) quedó en:
  - `price = 360000.00`
  - `compareAtPrice = null`

### Nota

El cruce operativo se hizo contra el catálogo Alegra expuesto por `/api/alegra/items` y las variantes reales de Shopify.
