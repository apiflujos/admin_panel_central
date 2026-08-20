# Diagnóstico `becam-workers` — 11,3 GB de log en 42 días

**Fecha:** 2026-08-20 · **Host:** LXC 108 `webserver-apiflujos-central` (10.20.2.34), Proxmox `pve2` (10.20.2.9)
**Rama desplegada:** `client/becam` @ `05aea7f` · **App:** `/srv/apiflujos/becam/admin_panel_central` (PM2 `becam-workers`)
**Log analizado:** `logs/becam-workers.err.log` — **11.344.256.495 bytes, 152.724.330 líneas**, del 2026-07-09 al 2026-08-20.

Se hizo una pasada completa sobre los 11 GB agregando por mensaje normalizado (`mensajes-agregados.txt`,
550 mensajes distintos). Muestra cruda del tramo final en `muestra-log-final-5MB.txt`.

---

## Reparto real del log (esto importa: el error dominante NO es Shopify)

| # | Causa | Errores | % del log aprox. |
|---|---|---|---|
| 1 | **Redis `ENOTFOUND redis`** | **~16.335.857** | **~65 %** |
| 2 | Shopify GraphQL: `productVariantUpdate` no existe | ~1.433.557 | ~14 % |
| 3 | Shopify GraphQL: `ProductInput.variants` no existe | ~993.243 | ~10 % |
| 4 | `timeout exceeded when trying to connect` (pool Postgres) | ~399.307 | ~4 % |
| 5 | `duplicate key ... "products_org_shopify_store_idx"` | ~5.600 | <1 % |
| 6 | Postgres `severity: 'FATAL'` | 513 | <1 % |

Cada error imprime el objeto `Error` completo con stack trace (≈6–10 líneas), de ahí los 152 M de líneas.

---

## P0 — Redis apunta a un hostname de Docker que no existe (2 minutos de arreglo)

**El 65 % del log es esto.** En producción:

```
REDIS_URL=redis://redis:6379      # .env  ← hostname de Docker Compose
```

El CT **no es Docker** (es systemd/PM2 nativo). `getent hosts redis` → no resuelve.
Pero **hay un Redis local sano**: `redis-server` escuchando en `127.0.0.1:6379` y `[::1]:6379`, responde `PONG`.

**Arreglo:** `REDIS_URL=redis://127.0.0.1:6379`.

Usar `127.0.0.1` y no `localhost`: `localhost` puede resolver a `::1` primero y algunos clientes
no hacen *happy eyeballs*. El servidor escucha en ambas, pero la IPv4 explícita es determinista.

**Además, en código:** el cliente Redis reintenta sin límite y **loguea cada intento**. Hay que ponerle
`maxRetriesPerRequest`, backoff exponencial y **loguear el fallo de conexión una vez por ventana**, no por intento.
14.791 errores de Redis en la última hora = ~4 por segundo, todos idénticos.

---

## P1 — Shopify: el código pide una versión de API retirada y Shopify "cae hacia adelante"

### La causa raíz

`src/utils/shopify.ts`:
```ts
export const DEFAULT_SHOPIFY_API_VERSION = ENV_DEFAULT || "2024-04";
```
y en el `.env` de producción `SHOPIFY_API_VERSION=` está **vacío** → se usa `2024-04`, una versión ya retirada
(Shopify soporta cada versión ~12 meses).

Documentación oficial — https://shopify.dev/docs/api/usage/versioning:

> *"API responses include the `X-Shopify-API-Version` header reflecting the version used to fulfill the request.
> If it differs from what you requested, your app is targeting an inaccessible version and **Shopify has fallen
> forward to the default**."*

Y con más precisión, en https://shopify.dev/docs/api/admin-rest/usage/versioning:

> *"if your app uses a stable version that is no longer supported, then Shopify **falls forward and responds to
> your request with the same behaviour as the oldest supported stable version**."*

Es decir: **el código cree hablar 2024-04, pero Shopify le responde con la versión soportada más antigua**
(hoy `2025-10`), donde las mutaciones que usa ya no existen. Por eso los errores son de esquema
(`undefinedField`), no avisos de deprecación.

### Roturas concretas

**a) `productVariantUpdate` fue eliminada** — `src/connectors/shopify.ts:1069` y `:1077`

```graphql
mutation UpdateVariantPrice($input: ProductVariantInput!) {
  productVariantUpdate(input: $input) { userErrors { field message } }
}
```
Error real: `Field 'productVariantUpdate' doesn't exist on type 'Mutation'` (+ `Variable $input is declared by
UpdateVariantPrice but not used`, consecuencia del anterior).

Reemplazo oficial: **`productVariantsBulkUpdate`**
(https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkUpdate).
Ojo a la diferencia de firma — **exige `productId`**, que hoy no se pasa:

```graphql
mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price compareAtPrice }
    userErrors { field message }
  }
}
```
Afecta a dos call-sites: `updateVariantPrice()` (`shopify.ts:271`) y `updateVariantInventoryPolicy()` (`shopify.ts:329`).
Ambos reciben solo `variantId` → hay que propagar el `productId` (la query
`PRODUCT_VARIANT_BY_IDENTIFIER_QUERY` ya devuelve `product { id }`, así que el dato está disponible).

**b) `ProductInput.variants` fue eliminado** — `src/connectors/shopify.ts:1171` (`CreateProduct`)

Error real:
```
Variable $input of type ProductInput! was provided invalid value for variants
(Field is not defined on ProductInput)
```
El payload que se envía hoy:
```json
{"title":"...","status":"DRAFT",
 "variants":[{"price":"68873.53","sku":"7702678946422",
              "inventoryItem":{"tracked":true},"inventoryManagement":"SHOPIFY"}]}
```
En el modelo de producto nuevo, `ProductInput` ya no lleva `variants`. Dos caminos:

1. **`productSet`** con `ProductSetInput.variants` (`ProductVariantSetInput`) — una sola llamada, ideal para
   sincronización idempotente desde un sistema externo como Alegra. Es el que recomiendo aquí.
2. `productCreate` y después `productVariantsBulkCreate` — dos llamadas.

Nota extra: **`inventoryManagement` también desapareció**; el equivalente es `inventoryItem.tracked`
(que el código ya envía en paralelo — se puede eliminar `inventoryManagement` sin más).

---

## P2 — El bucle infinito: el checkpoint RETROCEDE cuando hay fallos

Esto es lo que convierte "unos errores" en 152 millones de líneas.
`apps/workers/src/pollers/products-sync.ts:143`:

```ts
const checkpointValue =
  hadFailure && minFailedUpdatedAt != null
    ? Math.max(sinceMs, minFailedUpdatedAt - 1)   // ← retrocede al ítem fallido más antiguo
    : lastSeen;
```

La intención es sana (no saltarse ítems que fallaron). El problema: **con un fallo permanente el checkpoint
nunca avanza**, así que en cada tick se re-procesa el catálogo entero, falla entero y se re-loguea entero.

Con `PRODUCTS_SYNC_POLL_SECONDS=900` (default, el `.env` lo tiene vacío) eso son **96 pasadas al día**
sobre ~5.000 ítems × 2 tiendas (`mut50d-tj` y `w52tw8-nm`).

**Qué debe hacer el agente que repare esto:**
- Contador de intentos por ítem: tras N fallos, mandarlo a una *dead-letter* y **dejar de bloquear el checkpoint**.
- Distinguir **error transitorio** (red, 429, 5xx → reintentar) de **error permanente**
  (`undefinedField`, `INVALID_VARIABLE` → nunca va a funcionar; no reintentar jamás).
- **Circuit breaker**: si N ítems seguidos fallan con el mismo error de esquema, abortar la pasada y loguear
  **una** línea, no 5.000.
- Deduplicar el logging: agregar por `(código de error, tienda)` con un contador, en vez de `console.error` por ítem.
- `console.error(..., result.reason)` vuelca el `Error` entero con stack; loguear `error.message` y el stack
  **una sola vez** por clase de error.

---

## P3 — Hallazgos menores (reales, pero no son los que llenan el disco)

- **`timeout exceeded when trying to connect`** (~399 k): agotamiento del pool de Postgres, coherente con
  el fan-out de `Promise.allSettled` sin límite de concurrencia por encima del tamaño del pool.
  Hay 513 `severity: 'FATAL'` de Postgres en el periodo.
- **`duplicate key value violates unique constraint "products_org_shopify_store_idx"`** en `[retry-queue]`:
  un upsert que no está usando `ON CONFLICT` sobre ese índice. Se repite ~1.100 veces por `orderId`,
  o sea el retry-queue reintenta indefinidamente algo que siempre chocará.

---

## P4 — Higiene operativa (independiente del código)

No había **ninguna** rotación de logs: ni `pm2-logrotate` instalado (`~/.pm2/modules` vacío) ni regla en
`/etc/logrotate.d/` para `/srv/apiflujos`. Un solo archivo llegó a 11,3 GB sin que nada lo frenara.

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```
(El journal de systemd ya quedó capado el 2026-08-20 en `/etc/systemd/journald.conf.d/99-limite.conf`.)

---

## Orden de ataque sugerido

1. **`REDIS_URL`** → mata el 65 % del ruido en 2 minutos, sin tocar código.
2. **`pm2-logrotate`** → garantiza que esto no pueda repetirse.
3. **Fijar `SHOPIFY_API_VERSION`** a una versión estable soportada y **anclarla explícitamente**; añadir un
   arranque que lea `X-Shopify-API-Version` de la respuesta y **grite si no coincide** con la pedida.
4. **Migrar las mutaciones**: `productVariantsBulkUpdate` y `productSet`.
5. **Checkpoint + circuit breaker + dedupe de logs** en `products-sync.ts` — sin esto, el próximo error
   permanente vuelve a llenar el disco.
6. Pool de Postgres y el `ON CONFLICT` del retry-queue.

Los puntos 1–2 son operativos y se pueden hacer ya. Los 3–6 son el trabajo de repo.


---

## Estado: CORREGIDO en `fix/shopify-api-2026-07-y-resiliencia`

Todo lo anterior está implementado y verificado (typecheck limpio, 141 tests en verde, +20 nuevos).
Los 8 tests que fallan son **preexistentes** — se comprobó ejecutando la misma suite sobre `client/becam`
en un worktree limpio: idénticos 8 fallos, ninguno relacionado.

| Archivo | Qué se hizo |
|---|---|
| `src/utils/shopify.ts` | Default `2024-04` → **`2026-07`**; validación de formato; `assertShopifyApiVersionMatches()` |
| `src/connectors/shopify.ts` | Migradas 4 operaciones; `mutate()` que **convierte `userErrors` en excepción** (antes se ignoraban); `getProductIdByVariantId()` |
| `src/connectors/shopify-errors.ts` | **Nuevo.** Clasificación permanente/transitorio + `errorSignature()` |
| `apps/workers/src/pollers/products-sync.ts` | Checkpoint ya no retrocede por errores permanentes; cortacircuitos; logs agregados por causa |
| `src/services/products.service.ts` | Anti-colisión entre los dos índices únicos (el `duplicate key`) |
| `src/services/retry-queue.service.ts` | Los errores permanentes van directo a `failed` |
| `src/marketing/infra/redis.ts` | Log agregado por ventana + backoff exponencial |

### Mutaciones migradas

| Antes | Ahora |
|---|---|
| `productVariantUpdate(input:)` ×2 | `productVariantsBulkUpdate(productId:, variants:)` |
| `productCreate(input: ProductInput!)` con `variants` | `productCreate(product: ProductCreateInput!)` + `productVariantsBulkUpdate` |
| `createProduct()` con `input.variants`/`options` | **`productSet(input: ProductSetInput!)`** |
| `productUpdate(input:)` *(deprecado)* | `productUpdate(product: ProductUpdateInput!)` |

Detalles del esquema que costaron una verificación cada uno:
- `productVariantsBulkUpdate` **exige `productId`**, que la mutación vieja no pedía. Los call-sites que ya lo
  tenían (`matched.productId`, `mapped.shopifyProductId`, `match.productId`, `variantNode.product.id`) ahora lo
  pasan; para el resto hay un *fallback* que lo resuelve con una query.
- El **SKU se movió a `inventoryItem.sku`** en `ProductVariantsBulkInput` (no existe como campo directo).
  En `ProductVariantSetInput` sí existe directo. No son intercambiables.
- `inventoryManagement` **ya no existe**: sustituido por `inventoryItem.tracked`.
- `ProductVariantSetInput.optionValues` es **obligatorio**. Un producto sin opciones reales usa la opción
  implícita `Title` / `Default Title`.
- ⚠️ **`productSet` BORRA las entradas de lista que no se incluyan en el input** (variantes incluidas).
  Aquí sólo se usa para CREAR productos nuevos. **No reutilizar para actualizaciones parciales.**

## Deuda conocida que NO se tocó (decisión consciente)

`buildShopifyPayload()` en `src/api/products.controller.ts` construye payload **REST** (`inventory_management`,
`inventory_policy` en snake_case) y lo envía a `POST /products.json`. La REST Admin API de productos está
**deprecada desde 2024-10** y desde el 1-abr-2025 las apps públicas nuevas deben usar sólo GraphQL — pero
**sigue operativa** para apps existentes como esta, y **no aparecía ni un solo error suyo** en los 11,3 GB
analizados. Migrarla es un trabajo aparte, no una corrección de este incidente. Queda anotado para planificarlo.
