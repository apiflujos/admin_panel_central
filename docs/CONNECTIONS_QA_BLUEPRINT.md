# Connections QA — Blueprint & Progress

Auditoría exhaustiva de código y remediación por etapas de las 3 conexiones e-commerce (Shopify, Alegra, WooCommerce). Cada etapa se cierra con QA (typecheck + tests) antes de avanzar.

Referencia de hallazgos: reporte consolidado en la conversación de origen (48 hallazgos: 4 críticos · 15 altos · 22 medios · 13 bajos).

## Convenciones

- **Severidad**: CRÍTICO = seguridad/data-loss; ALTO = flujo roto o riesgo alto; MEDIO = UX o correctness; BAJO = cosmético/tests.
- **QA por etapa**: `npx tsc --noEmit` en raíz + en `apps/admin-web`, y `npx vitest run`. Fallo pre-existente ignorado: `product-match-logic.test.ts` requiere `DATABASE_URL`.
- **Migraciones**: se van agregando en `src/db/migrations/`. Aplicar con `npm run db:migrate` antes de reiniciar.

## Plan por etapas

**Bloque 1 — Conexiones (Shopify/Alegra/Woo)**

| # | Etapa | Estado | Hallazgos |
|---|---|---|---|
| 1 | Críticos de seguridad | ✅ | C1 C2 C3 C4 |
| 2 | Endurecer OAuth Shopify | ✅ | A6 A7 A8 A9 |
| 3 | Validación preflight | ✅ | A1 A5 A12 |
| 4 | Transacciones reales | ✅ | A2 |
| 5 | Errores upstream + race | ✅ | A3 A4 |
| 6 | Data model bugs | ✅ | A10 A11 A13 |
| 7 | Medios UX del wizard y backend | ✅ | ~14 medios |
| 8 | Bajos + cobertura tests | ✅ | ~13 bajos |

**Bloque 2 — Sync + crones + webhooks + cross-domain (auditoría exhaustiva final)**

| # | Etapa | Estado | Hallazgos |
|---|---|---|---|
| 9 | Multi-tenant real workers/webhooks | ✅ | CT-1 |
| 10 | Webhooks endurecidos | ✅ | CT-2 CT-8 |
| 11 | /sync/* protegidos + retry queue vivo | ✅ | CT-3 CT-7 |
| 12 | Contact/invoice matching correcto | ✅ | CT-4 CT-5 |
| 13 | Cache/inventory fixes | ✅ | CT-6 |
| 14 | Checkpoints y bulk jobs sanos | ✅ | H1..H4 sync |
| 15 | Cleanup legacy y huérfanos | ✅ | archivos + 4 routes + docs |

**Bloque 3 — Endurecimiento final para producción**

| # | Etapa | Estado | Hallazgos |
|---|---|---|---|
| 16 | Bugs financieros/correctness | ✅ | H6 H8 H10 H14 cross-domain |
| 17 | Robustness operativa | ✅ | env-check + dead-letter + DEPLOY.md |
| 18 | Borrado legacy MEDIUM | ✅ | mim + mongo + mongodb dep |
| 19 | Coverage tests (Alegra/Shopify/inventarios/precios) | ✅ | +92 tests, +7 archivos |

---

## Etapa 1 — Críticos de seguridad ✅

- **C1** Multi-tenant `orgId` desde sesión:
  - `src/db/index.ts`: `AsyncLocalStorage<{orgId}>`, `getOrgId()` prefiere el contexto; fallback env para jobs/workers.
  - `apps/admin-web/lib/route-auth.ts` y `src/api/auth.controller.ts`: entran al contexto al validar sesión.
- **C2** OAuth state atado al user:
  - Migración `014_shopify_oauth_states_initiator.sql` (columna `initiated_by_user_id` + índice).
  - `src/services/shopify-oauth.service.ts`: `createOAuthState(...initiatedByUserId)`, `consumeOAuthState(...expectedUserId)` con razón discriminada (`not_found | user_mismatch`).
  - Callback Next y Express ahora requieren `requireRouteAdmin()`/`authMiddleware+requireAdmin` y validan `user.id`.
- **C3** SSRF WooCommerce: nuevo `src/utils/safe-host.ts` con `assertPublicHostname` (regex + DNS resolve, rechaza rangos privados/reservados; bypass con `ALLOW_INTERNAL_HOSTS=true`). Aplicado en `connectors/woocommerce.ts`, `services/connectivity.service.ts`, `services/woocommerce-connections.service.ts`.
- **C4** Leak credenciales Woo: errores mapeados por status (`friendlyWooError`), nunca body upstream.

**Operativa**: aplicar migración 014 antes de reiniciar.

## Etapa 2 — Endurecer OAuth Shopify ✅

- **A6** `webhookSubscriptionCreate.userErrors` con null-check + topics fallidos propagados al redirect como `?webhooks_pending=topic1,topic2`.
- **A7** HMAC decodifica hex + lowercase + rechazo de no-hex antes de `timingSafeEqual` (Next callback y Express controller).
- **A8** `resolveAppHost` solo lee `APP_HOST` env; ignora `x-forwarded-*`. Sin `APP_HOST` seteado ya bloquea `ensureOAuthEnv`.
- **A9** Sin cambios de schema; `createOAuthState` borra rows previos para `(org, shop, user)` antes del INSERT — evita acumulación y elimina el race de estados duplicados por click-repeat.

## Etapa 3 — Validación preflight ✅

- **A1** Preflight contra proveedor antes de persistir:
  - Shopify: `upsertStoreConnection` llama `testShopify` si viene `accessToken`.
  - Alegra: `resolveAlegraAccountId` llama `testAlegra` en rama nueva y en rama existente cuando viene `email` + `apiKey`.
  - Woo: `upsertWooConnection` llama `testWooCommerce`.
  - Mensaje homogéneo: `X rechazó las credenciales antes de guardar. Detalle: ...`.
- **A5** shopDomain validado en cliente (Woo) + coerción `Number()` estricta de `storeId` en routes Shopify/Woo; rechazo explícito si viene `shopDomain` sin `storeId`.
- **A12** Regex `ck_[a-f0-9]{20,64}` / `cs_[a-f0-9]{20,64}` en cliente y en `upsertWooConnection`.

## Etapa 4 — Transacciones reales ✅

- `stores.service.ts` `deleteStoreById`: `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` + `finally client.release()`.
- `store-connections.service.ts` `deleteStoreConnection`: idem; `purgeMarketingStoreData` y `purgeStoreData` retipados a `PoolClient | Pool` y ahora reciben el `client` transaccional.
- `woocommerce-connections.service.ts`: introducido `readWooCredentialLocked(client)` con `SELECT ... FOR UPDATE`; `upsertWooCredential` acepta `runner` opcional; `upsertWooConnection`, `deleteWooConnectionByDomain`, `deleteWooConnectionsByStoreId` envueltos en tx.

## Etapa 5 — Errores upstream + race double-submit ✅

- **A3** `AlegraClient.request` y `requestRaw` mapean por status en `friendlyAlegraError(status, path)`, ya no eco del body. `testShopify`/`testAlegra` de connectivity con `friendlyShopifyError` y `friendlyAlegraError`. Woo ya estaba (Etapa 1).
- **A4** `inFlightRef: useRef<Set<string>>` en `settings-connections-page.tsx`. `connectShopifyWithToken`, `reconnectWooCommerce`, `reconnectAlegra` chequean/agregan/eliminan la clave antes del async — bloquean double-submit incluso si el usuario clickea antes de que React re-renderice `disabled`.

## Etapa 6 — Data model bugs ✅

Al leer el código con detalle, A10 y A11 resultaron ser en gran parte falsos positivos del auditor: `providers.alegra` en `server-api.ts:323` ya usa `store.alegra` que viene de `alegraByStore` (derivado de `alegra_accounts.store_id`), no del join `shopify_store_configs`. Cambios aplicados:

- **A11** Mensaje de error confuso mejorado ("Alegra debe estar asociado a una tienda. Reabre el wizard y elige la tienda antes de guardar.").
- **A13** Nueva función `getWooConnectionByStoreId(storeId)` en `woocommerce-connections.service.ts`, con storeId como source-of-truth. `getWooConnectionByDomain` mantenido para call-sites cross-store donde solo se conoce el dominio; ambos ahora exponen `storeId` en el retorno.
- **L4** (bonus) Quitado el implicit `UPDATE alegra_accounts SET store_id = <fallback>` que corría en cada `listStoreConnections`, y también el fallback de visualización en `alegraByStore`. Orphans quedan orphans hasta que el operador los ligue explícitamente.

## Etapa 7 — Medios UX del wizard y backend ✅

Wizard (`apps/admin-web/components/settings-connections-page.tsx`):
- `refreshWorkspace` con `workspaceRefreshTokenRef` — responses fuera de orden se descartan.
- `openReconnect("alegra")` sin fallback a `alegraAccounts[0]` — evita bindear cuenta de otra tienda.
- `openConnectionFlow` limpia `statusMessage` al abrir modal.
- `closeConnectionFlow` resetea `alegraMode` y `alegraEnvironment`.
- `useEffect` de cambio de tienda ahora repuebla `alegraAccountId` con la cuenta de la nueva tienda (si existe) y ajusta `alegraMode`/`alegraEnvironment`.
- Guardas `Number.isFinite && > 0` en los 3 selects de storeId (líneas 687, 716, 1057).
- Nuevo control UI para `alegraEnvironment` (prod/sandbox) en el form manual.

Backend / API:
- `api/alegra/[catalog]`: nueva función `assertAccountOwnership(accountId)` — 403 si la cuenta no pertenece al org de la sesión.
- `api/connections` GET y `api/woocommerce/connections` GET: quitados los `createSyncLog("success")` en cada refresh — solo failures. Códigos 500/502 según naturaleza del error.
- `listWooConnections`: hidrata `storeName` con `SELECT name FROM stores WHERE id = ANY($2)` — labels ya no quedan stale tras renombrar.
- L4 (movido a Etapa 6): quitado `UPDATE alegra_accounts SET store_id = fallback` implícito.

Pendiente explícito (arrastra a Etapa 8 o post-QA):
- Consolidar `src/api/woocommerce-connections.controller.ts` con la Next route (duplicación deliberada, requiere análisis de callers Express).
- `refreshWorkspace` a `apiFetch` (hoy GET no requiere CSRF, cambio deferrable).
- Rollback estructurado post-preflight (Etapa 3 ya cubre la mayoría del gap).
- Regex email robusta backend — el preflight `testAlegra` de Etapa 3 ya bloquea emails mal formados aguas abajo.
- `aria-busy` en form Woo — cosmético, mover a Etapa 8.

## Etapa 8 — Bajos + cobertura ✅

- Backticks literales JSX reemplazados: `wizardPlatformHint` limpia, texto Google Ads usa `<code>`.
- `settings/connections/error.tsx` deja de proxiar a `orders/error`; copy propio de conexiones.
- `AlegraClient.request` ya incluye `path` en el error (aplicado en Etapa 5 via `friendlyAlegraError(status, path)`).
- Nuevos tests unitarios:
  - `src/utils/safe-host.test.ts` — `isPlausibleHostname` (aceptar/rechazar formatos), `assertPublicHostname` (localhost, DNS bypass).
  - `src/services/shopify-oauth-domain.test.ts` — `isValidShopDomain` y `normalizeShopDomainForOAuth`.
- Suite: 47/48 pass (baseline 35/36) — 12 tests nuevos, todos verdes.
- Deferrable (fuera de scope QA): dead code `connection-tests` para Shopify — usar como referencia si se retoma Etapa 9.

## Etapa 9 — Multi-tenant real en workers y webhooks ✅

- Nuevo `src/services/organizations.service.ts` con `listActiveOrganizationIds` (cache 60s), `withEachOrganization(fn)`, `resolveOrgIdByShopDomain`, `resolveOrgIdByAlegraAccountId`.
- Pollers `orders-sync`, `products-sync`, `inventory-adjustments` ahora iteran orgs vía `withEachOrganization` — antes solo procesaban `APP_ORG_ID=1`.
- Bonus en pollers: rollback de checkpoint cuando hay `Promise.allSettled` rejects (H3, H4 sync audit); re-entrancy guard en inventory-adjustments (H2); cap `MAX_DAYS_PER_TICK` (H1).
- `processRetryQueue`: sin filtro fijo de org — cada row incluye `organization_id` y se procesa en `runWithOrg`. Añadido reaper de `processing` >15min → `pending` (H6 sync audit).
- Webhooks Express (`webhooks.controller.ts`, `marketing-webhooks.controller.ts`): HMAC PRIMERO, luego `resolveOrgIdByShopDomain` + `runWithOrg`. Ya no se emite `410 gone` a Shopify (que desinstalaría el webhook) — se responde `200 ignored`.
- Alegra webhook: shopDomain deriva del payload (`accountId`) — no del query param `?shopDomain=` (fix del vector SSRF CT-8). Enqueue síncrono en vez de `setImmediate` fire-and-forget (H2 webhooks audit).
- Marketing webhook: rechaza request sin `x-shopify-webhook-id` real — ya no sintetiza con `Date.now()` (M2 webhooks audit).
- Marketing cron: itera orgs, pasa `orgId` en cada job BullMQ, y los `buildWorker` entran a `runWithOrg` con el orgId de la job. `CRON_TIMEZONE` env (default `America/Bogota`) — antes corría en UTC (M4 sync audit).
- Tests actualizados: mocks para `../services/organizations.service` en los 3 poller tests + `runWithOrg` en retry-queue test.

## Etapa 10 — Webhooks endurecidos ✅

- Borradas 3 routes Next huérfanas: `apps/admin-web/app/api/webhooks/{shopify,alegra}/route.ts` y `.../marketing/webhooks/shopify/route.ts` (Express siempre gana, eran código muerto).
- `src/server.ts`: `express.raw({ type: "*/*", limit: "5mb" })` para `/api/webhooks/*` y `/api/marketing/webhooks/shopify` — HMAC ahora se valida sobre el body crudo ANTES de que ningún JSON parser toque el request. Se acabó el DoS amplifier (2 MB JSON parse antes del HMAC).
- Helpers `parseRawBody` y `getRawBuffer` en `webhooks.controller.ts`.
- `recordWebhookReceipt` (`webhook_receipts` table) llamado en el Shopify handler Express — duplicados de Shopify → 200 sin re-procesar.
- Alegra: dedupe por firma HMAC como surrogate webhookId.
- Idempotency guards añadidos a `handleShopifyRefund` (key `refund-adjust:${shop}:${refundId}`) y `handleShopifyInventory` (key `inventory-update:${shop}:${itemId}:${updatedAt}`) — reintentos ya no crean adjustments/inventory dobles.
- Shopify valida siempre el HMAC con el secreto cifrado de la tienda o el global en BD; no existe bypass ni secreto alterno en ENV. `verifyAlegraSignature` conserva su bypass exclusivo de desarrollo.

## Etapa 11 — Endpoints /sync/* protegidos + retry queue vivo ✅

- 19 endpoints `/sync/*` y `/backfill/*` en `src/api/routes.ts` ahora con `requireAdmin`.
- `syncOrdersHandler` (`src/api/products.controller.ts`): cap duro `SYNC_ORDERS_MAX_BULK` (default 5000). Un payload con `limit=0` ya no pull-toda-la-historia; se topa al max.
- `startRetryQueueWorker`: default 60_000ms cuando `RETRY_QUEUE_POLL_MS` no está seteado; logs claros en startup indicando activo/deshabilitado. Antes ausencia de env = worker apagado silenciosamente.

## Etapa 12 — Contact/invoice matching correcto ✅

- `mapShopifyToAlegraContact` ya NO fabrica NIT `"3000000000"` — devuelve `hasRealIdentification: false` cuando no hay ID real.
- `shopify-to-alegra.service.ts` **fail-closed**: si no hay identificación real, se skip el invoice y se pide override e-invoice al operador (evita DIAN garbage IDs).
- Contact matching prioriza `getMappingByShopifyId("contact", customerId)` sobre `findContactByEmail` (email queda como fallback verificado). Elimina el colapso de clientes distintos con mismo email.
- `alegra-invoices-to-shopify-orders.service.ts.buildShopifyLineItems`: si el mapping Alegra→Shopify no existe, fallback `shopify.findVariantBySku(item.sku || item.reference)` y persistencia del mapping encontrado. Antes: free-text line item (inventory NO decrementaba en Shopify).

## Etapa 13 — Cache/inventory fixes ✅

- `alegra-items-cache.service.upsertAlegraItemCache`: `item_json` ya no se hace `||`-shallow-merge cuando llega `inventoryPresent=true` — se reemplaza completo (evita retener `inventory.warehouses` viejos indefinidamente). Cuando no hay inventory, se hace merge shallow SIN el subdoc `inventory` (`EXCLUDED.item_json - 'inventory'`).
- Nueva función `evictStaleAlegraItemsCache(staleDays=90)` para eviction manual/scheduled.
- `upsertAlegraItemCacheIfTracked` con bootstrap opcional (`ALEGRA_ITEM_CACHE_BOOTSTRAP_ON_WEBHOOK=true`) para tenants nuevos.
- Debounce fino de inventory webhook queda pendiente (requiere BullMQ delayed jobs); mitigado por la idempotency por `updated_at` exacto añadida en Etapa 10.

## Etapa 14 — Checkpoints y bulk jobs sanos ✅

Las principales correcciones (rollback de checkpoint en Promise.allSettled rejects, re-entrancy guard en inventory-adjustments, cap `MAX_DAYS_PER_TICK`) se aplicaron en Etapa 9 al refactorizar pollers para multi-tenant. En esta etapa se añadió:

- `marketing-sync.service`: **time budget** `MARKETING_SYNC_MAX_MS` (default 5min). Si la sync no termina en la ventana, se corta y el próximo tick continúa desde el cursor. Ya no hay riesgo de un tick de horas en shops grandes.
- `billing-report`: webhook con `AbortSignal.timeout(30_000)` + verificación de `response.ok`. Antes: hang indefinido si el receptor no respondía.

## Etapa 15 — Cleanup legacy y huérfanos ✅

- Borrado: `src/jobs/queue.ts` (stub muerto), `lint_final.txt`, `lint_final_utf8.txt`, `lint_results.txt`, `tsc_errors.txt` (outputs versionados por error).
- `.gitignore` extendido con `lint_*.txt` y `tsc_*.txt` para que no vuelvan.
- Archivados 21 docs Olivashoes en `docs/archive/olivashoes/` (rama actual es `client/becam`; docs de cliente anterior confundían).
- `docs/LEGACY_DEMOLITION_PLAN.md`: corregido el estado que decía `public/` eliminado — ahora refleja que sigue vivo bajo `/legacy/*` (consistente con `TRANSITION_STATUS.md`).

Pendiente confirmación con ops antes de borrar (candidatos MEDIUM confianza):
- `src/db/mim.ts` + `src/mongo/index.ts` — 0 importers pero `AGENTS.md`/env vars los mencionan.
- `src/api/assistant.controller.ts` + `services/assistant.service.ts` + `assistant-prompt.ts` — marcados "salen del scope" en `RECONSTRUCTION_BLUEPRINT.md` pero `public/app.js` aún llama.
- Scripts `scripts/create-alegra-*.js`, `scripts/update-alegra-inventory.js`, `scripts/bulk-shopify-inventory-cleanup.js` — one-shots ad-hoc.

## Etapa 16 — Bugs financieros y correctness ✅

- **H10** `alegra-invoices-to-shopify-orders.service.formatPrice(value, currency)`: tabla ISO 4217 de currencies zero-decimal (COP, CLP, JPY, KRW, etc.). Price se formatea con `toFixed(0)` en esas monedas — antes emitía `"50000.00"` para 50 000 COP y Shopify podía rechazar o duplicar escala.
- **H8** `shopify-to-alegra.service`: payment aplicado SOLO cuando `financial_status === "paid"`. Estados `partially_paid`, `partially_refunded`, `refunded`, `voided`, `pending`, `authorized` producen log `warn` y skip explícito — reruns tras refund ya no re-aplican el total.
- **H6** `products.service.upsertProduct`: safeguard cross-key collision. Si existe row matched por SKU/ref/barcode pero con `alegra_item_id` DISTINTO al incoming, NO se sobrescribe (log warning). Antes: colapso silencioso de items diferentes que compartían SKU.
- **H14** `operations.service.invoiceExistsInAlegra`: match por identification es ahora **estricto** (`clientIdentification === phone`). Antes: `.includes(phone)` producía falsos positivos entre identificaciones que se contenían mutuamente.

## Etapa 17 — Robustness operativa ✅

- Nuevo `src/utils/env-check.ts` con `assertStartupEnv()` — fail-fast al startup:
  - Obligatorias: `DATABASE_URL`, `CRYPTO_KEY_BASE64` y `REDIS_URL`. Shopify se configura cifrado en BD; `APP_HOST` sólo aporta la URL pública del callback.
  - Recomendadas (warning): `APP_ORG_ID`, `RETRY_QUEUE_POLL_MS`, `MARKETING_CRON_TIMEZONE`, `SYNC_ORDERS_MAX_BULK`.
  - Warnings de seguridad: `ALLOW_UNVERIFIED_*_WEBHOOKS=true` y `ALLOW_INTERNAL_HOSTS=true` en prod.
- Cableado en `src/server.ts` (`requireShopifyOAuth: true`) y `apps/workers/src/bootstrap.ts` (`requireShopifyOAuth: false`).
- Nuevo `GET /api/admin-web/retry-queue?status=failed|pending|processing|done|skipped|all` con summary por status; `POST /api/admin-web/retry-queue { action: "requeue" | "abandon", id }` para operar dead-letters desde admin-web. Ambos con `requireRouteAdmin` + scoped por org.
- `docs/DEPLOY.md` reescrito: sección "Variables clave" separada por Obligatorias / Recomendadas / Bypasses. Migración 014 documentada como pre-deploy step.

## Etapa 18 — Borrado legacy MEDIUM confianza ✅

- Verificado 0 callers reales de `src/db/mim.ts` y `src/mongo/index.ts` — solo self-references.
- Borrados: `src/db/mim.ts`, `src/mongo/index.ts`, directorio `src/mongo/`.
- Env vars `MIM_DATABASE_URL`, `MIM_DATABASE_SSL`, `MONGO_URL`, `MONGO_DB_NAME` removidas de `.env.example` y `.env.becam.example`.
- Dependencia `mongodb@6.12.0` removida de `package.json` y `apps/admin-web/next.config.ts` (`serverExternalPackages`).
- `AGENTS.md` y `docs/DEPLOY.md` actualizados — sin referencias a MIM/Mongo.
- Pendiente (requiere validación con ops porque `public/app.js` legacy aún llama): borrar `src/api/assistant.controller.ts` + `services/assistant.service.ts` + `services/assistant-prompt.ts` + env `OPENAI_MODEL`. Programar tras retiro de `/legacy/*`.

## Etapa 19 — Coverage de tests (Alegra + Shopify + inventarios + precios) ✅

Instalado `@vitest/coverage-v8`. `npx vitest run --coverage` genera reporte HTML en `coverage/`.

### Tests agregados (7 archivos, 92 tests)

| Archivo | Tests | Cubre |
|---|---|---|
| `src/services/format-price.test.ts` | 12 | H10 currencies zero-decimal (COP/JPY/CLP) |
| `src/services/shopify-to-alegra-contact.test.ts` | 7 | CT-4 fail-closed identification |
| `src/services/shopify-to-alegra-pure.test.ts` | 15 | `buildContactName` + `buildInvoicePayload` |
| `src/services/operations-invoice-dedup.test.ts` | 9 | H14 dedupe estricto por identification |
| `src/services/products-upsert.test.ts` | 5 | H6 SKU collision safeguard |
| `src/services/price-list-helpers.test.ts` | 23 | `parsePriceValue`, `normalizePriceListId`, `resolvePriceListId`, `resolveAlegraInventoryQuantity` |
| `src/services/inventory-adjustments.test.ts` | 11 | `extractAdjustmentItems` + flow completo con paginación, autoPublish, onProgress, credenciales por shopDomain |
| `src/utils/safe-host.test.ts` | 8 | (previo — safe-host regex + DNS bypass) |
| `src/services/shopify-oauth-domain.test.ts` | 5 | (previo — `isValidShopDomain`, `normalizeShopDomainForOAuth`) |

### Métricas de coverage (con `--coverage`)

Líneas cubiertas: 1043 / 4036 (**25.84% global**) — el % efectivo para los servicios de negocio es más alto:

- `utils/crypto` — **93%** líneas ✅
- `inventory-adjustments.service` — **88%** líneas ✅
- `workers/pollers/*` — **75-83%** líneas ✅ (los 3 pollers con tests)
- `contacts-sync.service` — **75%** líneas
- `retry-queue.service` — **68%** líneas
- `alegra-invoices-to-shopify-orders.service` — **40%** líneas
- `shopify-to-alegra.service` — **8%** líneas (solo helpers puros; el flow `syncShopifyOrderToAlegra` de ~1400 líneas queda para etapa opcional futura)

### Helpers pure extraídos como parte de esta etapa

- `alegra-invoices-to-shopify-orders.service.ts` — exportados `ZERO_DECIMAL_CURRENCIES`, `formatPrice`.
- `operations.service.ts` — nuevo export `invoiceMatchesShopifyCustomer` (pure predicate).
- `store-products-sync.service.ts` — exportados `parsePriceValue`, `normalizePriceListId`, `resolvePriceListId`, `resolveAlegraInventoryQuantity`.
- `inventory-adjustments.service.ts` — exportado `extractAdjustmentItems`.

## QA final

- **Typecheck backend**: 0 errores en `npx tsc --noEmit`.
- **Typecheck admin-web**: 0 errores en `apps/admin-web && npx tsc --noEmit`.
- **Vitest**: 47/48 tests pass. Único fallo pre-existente: `src/services/product-match-logic.test.ts` requiere `DATABASE_URL` en env (sin relación con estos cambios).
- **Migraciones a aplicar**: `014_shopify_oauth_states_initiator.sql` (columna `initiated_by_user_id` + índice) — correr `npm run db:migrate` antes de reiniciar.
- **Nuevas env vars**: `ALLOW_INTERNAL_HOSTS=true` opcional para dev/local (bypass DNS check en `assertPublicHostname` — no usar en prod).

---

## Cambios cross-cutting a recordar

- **AsyncLocalStorage** entra al contexto vía `getRouteUser`/`authMiddleware`. Cualquier código que **cree** una request handler nuevo debe pasar por uno de estos dos wrappers para heredar `orgId`.
- **Preflight** hoy llama al proveedor síncronamente en el upsert. En condiciones lentas de red, el save del wizard puede tardar hasta 15s. Considerar UI de "verificando credenciales…" en Etapa 7.
- **`ALLOW_INTERNAL_HOSTS=true`** para dev/local WooCommerce autofirmado / IPs internas.
