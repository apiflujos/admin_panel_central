import {
  syncAlegraInventoryPayloadToShopify,
  syncAlegraItemPayloadToShopify,
  type AlegraItem,
} from "./alegra-to-shopify.service";
import { upsertAlegraItemCacheIfTracked } from "./alegra-items-cache.service";
import { syncShopifyOrderToAlegra, createInventoryAdjustmentFromRefund } from "./shopify-to-alegra.service";
import { createSyncLog, updateSyncLog } from "./logs.service";
import { acquireIdempotencyKey, markIdempotencyKey } from "./idempotency.service";
import { buildSyncContext } from "./sync-context";
import { upsertProduct } from "./products.service";
import { getMappingByShopifyId, getMappingByShopifyInventoryItemId, updateMappingMetadata } from "./mapping.service";
import { resolveStoreConfig } from "./store-config.service";
import { syncAlegraInvoiceToShopifyFromWebhook } from "./alegra-invoices-to-shopify-orders.service";
import {
  syncShopifyInventoryLevelToAlegra,
  syncShopifyProductToAlegraFromWebhook,
} from "./shopify-products-to-alegra-items.service";
import { ensureOrganization, ensureWebhookEventsTable, getOrgId, getPool } from "../db";
import { publishWebhookEvent } from "./webhook-queue";

export type WebhookSource = "shopify" | "alegra";

type JsonObject = Record<string, unknown>;

export type WebhookEvent = {
  source: WebhookSource;
  eventType: string;
  payload: unknown;
  meta?: JsonObject;
};

type ShopifyOrderWebhookPayload = JsonObject;

type ShopifyRefundWebhookPayload = {
  __shopDomain?: unknown;
  order_id?: unknown;
} & JsonObject;

type ShopifyInventoryWebhookPayload = {
  __shopDomain?: unknown;
  inventory_item_id?: unknown;
  inventoryItemId?: unknown;
  available?: unknown;
  availableQuantity?: unknown;
  updated_at?: unknown;
} & JsonObject;

type ShopifyProductWebhookVariant = {
  id?: unknown;
  sku?: unknown;
  inventory_item_id?: unknown;
};

type ShopifyProductWebhookPayload = {
  __shopDomain?: unknown;
  id?: unknown;
  title?: unknown;
  status?: unknown;
  updated_at?: unknown;
  variants?: ShopifyProductWebhookVariant[] | unknown;
} & JsonObject;

type AlegraWebhookEnvelope = {
  __shopDomain?: unknown;
  data?: unknown;
} & JsonObject;

function asRecord(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asStringId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Acepta un webhook y lo deja listo para procesarse fuera de la petición HTTP.
 *
 * Camino rápido: UNA fila en `webhook_events` (el registro de verdad) y un job
 * en Redis. El trabajo pesado —crear el sync_log y procesar— ocurre en el
 * worker `webhook-dispatch`.
 *
 * Antes esto era una transacción con tres INSERT que además tomaba su propia
 * conexión con `pool.connect()`. Con el pool pequeño, el webhook que caía
 * cuando no había conexiones libres esperaba hasta el timeout y devolvía 500.
 *
 * Si Redis no está disponible se cae al camino de base de datos de siempre
 * (sync_log + retry_queue), de modo que nunca se pierde un evento aceptado.
 */
export async function enqueueWebhookEvent(event: WebhookEvent) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureWebhookEventsTable(pool);

  const registered = await pool
    .query<{ id: number }>(
      `
      INSERT INTO webhook_events
        (organization_id, source, event_type, payload_json, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
      `,
      [orgId, event.source, event.eventType, event.payload]
    )
    .catch(() => null);
  const registeredId = registered?.rows[0]?.id ?? null;

  if (registeredId) {
    const published = await publishWebhookEvent({ webhookEventId: registeredId, orgId, event });
    if (published) {
      // El sync_log lo crea el worker al empezar a procesar: aquí sólo interesa
      // soltar la petición HTTP cuanto antes.
      return { status: "queued", event, syncLogId: null, webhookEventId: registeredId };
    }
    console.warn(`[webhook] Redis no aceptó webhookEventId=${registeredId}; se usa el camino de base de datos.`);
  }

  return enqueueWebhookEventViaDatabase(event, registeredId);
}

/**
 * Procesa un webhook despachado por la cola de Redis.
 *
 * Crea el `sync_log` que el resto del sistema espera y delega en
 * `processQueuedWebhookEvent`. Vive aquí, y no en el worker, porque necesita
 * `buildLogMeta`, que es privado de este módulo.
 *
 * Lanza si el procesamiento falla: es BullMQ quien decide reintentar, con su
 * backoff, y quien acaba dejando el job en la dead-letter.
 */
export async function processWebhookDispatchJob(params: { webhookEventId: number; event: WebhookEvent }) {
  const meta = buildLogMeta(params.event);
  const syncLogId = await createSyncLog({
    entity: meta.entity,
    direction: meta.direction,
    status: "queued",
    message: meta.message,
    request: {
      ...(meta.request || {}),
      webhookEvent: {
        source: params.event.source,
        eventType: params.event.eventType,
        payload: params.event.payload,
        meta: params.event.meta || {},
        webhookEventId: params.webhookEventId,
      },
    },
  });

  if (!syncLogId) {
    throw new Error(`No se pudo crear el sync_log para webhookEventId=${params.webhookEventId}`);
  }

  return processQueuedWebhookEvent({
    syncLogId,
    event: params.event,
    webhookEventId: params.webhookEventId,
  });
}

/**
 * Camino de respaldo: registra el evento y lo deja en `retry_queue`, que es
 * quien lo recogerá. Se usa cuando Redis no está disponible.
 *
 * @param existingWebhookEventId fila ya creada por el camino rápido; si viene,
 * no se vuelve a insertar.
 */
async function enqueueWebhookEventViaDatabase(event: WebhookEvent, existingWebhookEventId: number | null = null) {
  const pool = getPool();
  const orgId = getOrgId();
  const meta = buildLogMeta(event);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let webhookEventId = existingWebhookEventId ?? undefined;
    if (!webhookEventId) {
      const webhookEventResult = await client.query<{ id: number }>(
        `
        INSERT INTO webhook_events
          (organization_id, source, event_type, payload_json, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id
        `,
        [orgId, event.source, event.eventType, event.payload]
      );
      webhookEventId = webhookEventResult.rows[0]?.id;
    }
    const syncLogResult = await client.query<{ id: number }>(
      `
      INSERT INTO sync_logs
        (organization_id, entity, direction, status, message, request_json, response_json)
      VALUES ($1, $2, $3, 'queued', $4, $5, $6)
      RETURNING id
      `,
      [
        orgId,
        meta.entity,
        meta.direction,
        meta.message,
        {
          ...(meta.request || {}),
          webhookEvent: {
            source: event.source,
            eventType: event.eventType,
            payload: event.payload,
            meta: event.meta || {},
            webhookEventId,
          },
        },
        null,
      ]
    );
    const syncLogId = syncLogResult.rows[0]?.id;
    if (syncLogId) {
      await client.query(
        `
        INSERT INTO retry_queue (sync_log_id, next_run_at, status)
        VALUES ($1, NOW(), 'pending')
        ON CONFLICT (sync_log_id) DO NOTHING
        `,
        [syncLogId]
      );
    }
    await client.query("COMMIT");
    return { status: "queued", event, syncLogId: syncLogId || null, webhookEventId: webhookEventId || null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processWebhookEvent(event: WebhookEvent) {
  if (event.source === "shopify") {
    return processShopifyWebhook(event.eventType, event.payload);
  }
  if (event.source === "alegra") {
    return processAlegraWebhook(event.eventType, event.payload);
  }
  return { ignored: true, eventType: event.eventType };
}

/**
 * Por qué un evento que SÍ se recibió no produjo ningún efecto.
 *
 * Un webhook puede procesarse «bien» y no hacer nada: tipo de evento que no
 * entendemos, falta el id de la factura, la sincronización está apagada. Sin
 * dejar constancia, en la pantalla figuraba como «procesado» y nadie podía
 * saber que en realidad no ocurrió nada.
 *
 * Devuelve null cuando el evento sí tuvo efecto.
 */
function motivoSinEfecto(resultado: unknown): string | null {
  const r = asRecord(resultado);
  if (!r) return null;
  if (r.ignored === true) return typeof r.reason === "string" ? r.reason : "evento_no_reconocido";
  if (r.handled === false || r.skipped === true) {
    return typeof r.reason === "string" ? r.reason : "sin_efecto";
  }
  return null;
}

export async function processQueuedWebhookEvent(params: {
  syncLogId: number;
  event: WebhookEvent;
  webhookEventId?: number | null;
}) {
  const meta = buildLogMeta(params.event);
  const pool = getPool();
  try {
    const result = await processWebhookEvent(params.event);
    await updateSyncLog(params.syncLogId, {
      status: "success",
      message: meta.message,
      response: { result },
    });
    if (params.webhookEventId) {
      // El motivo se guarda aunque el estado sea «processed»: recibir y no
      // hacer nada es un hecho que tiene que poder verse y explicarse.
      await pool.query(
        `
        UPDATE webhook_events
        SET status = 'processed', processed_at = NOW(), error_motivo = $3, error_detalle = NULL
        WHERE organization_id = $1 AND id = $2
        `,
        [getOrgId(), params.webhookEventId, motivoSinEfecto(result)]
      );
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled error";
    await updateSyncLog(params.syncLogId, {
      status: "fail",
      message,
    });
    if (params.webhookEventId) {
      await pool.query(
        `
        UPDATE webhook_events
        SET status = 'failed', error_motivo = 'error_al_procesar', error_detalle = $3
        WHERE organization_id = $1 AND id = $2
        `,
        [getOrgId(), params.webhookEventId, message.slice(0, 2000)]
      );
    }
    throw error;
  }
}

export async function processShopifyWebhook(eventType: string, payload: unknown) {
  switch (eventType) {
    case "orders/create":
    case "orders/updated":
    case "orders/paid":
      return handleShopifyOrder(payload);
    case "refunds/create":
      return handleShopifyRefund(payload);
    case "inventory_levels/update":
      return handleShopifyInventory(payload);
    case "products/create":
    case "products/update":
      return handleShopifyProduct(payload);
    default:
      return { ignored: true, eventType };
  }
}

function extractShopDomain(payload: unknown) {
  const raw = asRecord(payload)?.__shopDomain;
  return asString(raw) || "";
}

async function handleShopifyOrder(payload: unknown) {
  const data: ShopifyOrderWebhookPayload = asRecord(payload) || {};
  const result = await syncShopifyOrderToAlegra(data);
  return { handled: true, type: "order", result };
}

async function handleShopifyRefund(payload: unknown) {
  const shopDomain = extractShopDomain(payload);
  const ctx = await buildSyncContext(shopDomain);
  const data: ShopifyRefundWebhookPayload = (asRecord(payload) || {}) as ShopifyRefundWebhookPayload;
  const refundId = (data as { id?: unknown }).id;
  const idempotencyKey = refundId ? `refund-adjust:${shopDomain}:${String(refundId)}` : "";
  if (idempotencyKey) {
    const guard = await acquireIdempotencyKey(idempotencyKey);
    if (!guard.acquired) {
      if (guard.status === "completed") {
        return { handled: false, type: "refund", reason: "already_processed" };
      }
      // processing/failed: retryable — dejamos que el retry-queue lo agarre.
      throw new Error(`Refund idempotency conflict (status=${guard.status}) — will retry`);
    }
  }
  try {
    const result = await createInventoryAdjustmentFromRefund(data, ctx.alegraWarehouseId, ctx);
    if (idempotencyKey) {
      await markIdempotencyKey(idempotencyKey, "completed").catch(() => undefined);
    }
    await createSyncLog({
      entity: "refund",
      direction: "shopify->alegra",
      status: "success",
      message: "Refund processed",
      request: { orderId: data.order_id || null },
      response: { result },
    });
    return { handled: true, type: "refund", result };
  } catch (error) {
    if (idempotencyKey) {
      await markIdempotencyKey(
        idempotencyKey,
        "failed",
        error instanceof Error ? error.message : "refund_failed"
      ).catch(() => undefined);
    }
    await createSyncLog({
      entity: "refund",
      direction: "shopify->alegra",
      status: "fail",
      message: (error as { message?: string })?.message || "Refund failed",
      request: { orderId: data.order_id || null },
    });
    throw error;
  }
}

async function handleShopifyInventory(payload: unknown) {
  const data: ShopifyInventoryWebhookPayload = (asRecord(payload) || {}) as ShopifyInventoryWebhookPayload;
  const shopDomain = extractShopDomain(payload);
  const inventoryItemId = data.inventory_item_id || data.inventoryItemId;
  const availableRaw = data.available ?? data.availableQuantity;
  const available = typeof availableRaw === "number" ? availableRaw : Number(availableRaw);
  if (!inventoryItemId || !Number.isFinite(available)) {
    return { handled: false, reason: "missing_inventory_payload" };
  }

  // Idempotency por (shop, item, updated_at) — reintentos del mismo update se descartan.
  const updatedAt = (data.updated_at as string | undefined) || "";
  const idempotencyKey = updatedAt ? `inventory-update:${shopDomain}:${inventoryItemId}:${updatedAt}` : "";
  if (idempotencyKey) {
    const guard = await acquireIdempotencyKey(idempotencyKey);
    if (!guard.acquired) {
      if (guard.status === "completed") {
        return { handled: false, reason: "already_processed" };
      }
      throw new Error(`Inventory idempotency conflict (status=${guard.status}) — will retry`);
    }
  }

  const mapping = await getMappingByShopifyInventoryItemId("item", String(inventoryItemId));
  if (!mapping) {
    await createSyncLog({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "warn",
      message: "Inventory webhook without mapping",
      request: { inventoryItemId },
    });
    return { handled: false, reason: "missing_mapping" };
  }

  const shopifyProductId = mapping.shopifyProductId || mapping.shopifyId;
  if (shopifyProductId) {
    await upsertProduct({
      shopDomain,
      shopifyId: shopifyProductId,
      inventoryQuantity: available,
      source: "shopify",
      sourceUpdatedAt: (data.updated_at as string | undefined) || null,
    });
  } else {
    await createSyncLog({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "warn",
      message: "Inventory webhook missing shopify product id",
      request: { inventoryItemId },
    });
  }

  const syncToAlegra = await syncShopifyInventoryLevelToAlegra({
    shopDomain,
    inventoryItemId: String(inventoryItemId),
    available,
  });

  if (idempotencyKey) {
    await markIdempotencyKey(idempotencyKey, "completed").catch(() => undefined);
  }
  return { handled: true, type: "inventory", inventoryItemId, available, syncToAlegra };
}

async function handleShopifyProduct(payload: unknown) {
  const data: ShopifyProductWebhookPayload = (asRecord(payload) || {}) as ShopifyProductWebhookPayload;
  const shopDomain = extractShopDomain(payload);
  const productId = asStringId(data.id) || "";
  if (productId) {
    const variants = Array.isArray(data.variants) ? data.variants : [];
    const firstVariant = variants[0];
    const sku = asString(firstVariant?.sku) || null;
    // Resolver store_id para que upsertProduct colapse por TIENDA (la fila importada
    // de Alegra y la del webhook de Shopify = un solo producto). Sin store_id el
    // upsert usa scope por shop_domain y NO colapsa -> crea filas duplicadas.
    // No se debe DUPLICAR el producto: se ASOCIAN sus ids al mismo registro.
    let storeId: number | undefined;
    try {
      const storeRes = await getPool().query<{ store_id: number }>(
        `SELECT store_id FROM shopify_stores WHERE organization_id = $1 AND shop_domain = $2 ORDER BY created_at DESC LIMIT 1`,
        [getOrgId(), shopDomain]
      );
      const sid = storeRes.rows[0]?.store_id;
      if (typeof sid === "number" && Number.isFinite(sid) && sid > 0) storeId = sid;
    } catch {
      /* si no se resuelve, cae al comportamiento por shop_domain */
    }
    await upsertProduct({
      shopDomain,
      storeId,
      shopifyId: productId,
      name: asString(data.title) || null,
      sku,
      // NO sobreescribir `reference` con el SKU: la referencia/EAN es de Alegra y
      // no se debe cambiar desde el webhook de Shopify (protegida). Antes esto
      // pisaba la referencia con el SKU (colisión sku=reference).
      barcode: asString(firstVariant?.barcode) || null,
      statusShopify: asString(data.status) || null,
      sourceUpdatedAt: asString(data.updated_at) || null,
      source: "shopify",
    });
  }

  const variants = Array.isArray(data.variants) ? data.variants : [];
  for (const variant of variants) {
    const variantId = asStringId(variant.id) || "";
    const inventoryItemId = asStringId(variant.inventory_item_id) || "";
    if (!variantId || !inventoryItemId) continue;
    const mapping = await getMappingByShopifyId("item", variantId);
    if (mapping?.alegraId) {
      await updateMappingMetadata("item", mapping.alegraId, {
        shopifyInventoryItemId: inventoryItemId,
      });
    }
  }

  const syncToAlegra = await syncShopifyProductToAlegraFromWebhook(payload);
  return { handled: true, type: "product", productId, syncToAlegra };
}

export async function processAlegraWebhook(eventType: string, payload: unknown) {
  switch (eventType) {
    case "item.created":
    case "item.updated":
      return handleAlegraItem(payload);
    case "inventory.updated":
      return handleAlegraInventory(payload);
    case "invoice.created":
    case "invoice.updated":
      return handleAlegraInvoice(payload);
    default:
      if (
        String(eventType || "")
          .toLowerCase()
          .includes("invoice")
      ) {
        return handleAlegraInvoice(payload);
      }
      return { ignored: true, eventType };
  }
}

async function handleAlegraInvoice(payload: unknown) {
  const data: AlegraWebhookEnvelope = (asRecord(payload) || {}) as AlegraWebhookEnvelope;
  const envelope = asRecord(data.data) || data;
  const invoiceId = asStringId(envelope.id)?.trim() || "";
  if (!invoiceId) {
    return { handled: false, reason: "missing_invoice_id" };
  }
  const shopDomain = extractShopDomain(payload);
  const storeConfig = await resolveStoreConfig(shopDomain || null);
  const mode = storeConfig.syncOrdersAlegraToShopify;
  if (mode === "off") {
    return { handled: false, reason: "sync_off" };
  }
  const result = await syncAlegraInvoiceToShopifyFromWebhook({
    shopDomain: shopDomain || undefined,
    alegraInvoiceId: invoiceId,
    mode: mode === "active" ? "active" : "draft",
  });
  return { handled: true, type: "invoice", invoiceId, mode, result };
}

async function handleAlegraItem(payload: unknown) {
  const item = extractAlegraData(payload);
  const alegraItemId = item?.id ? String(item.id) : undefined;
  const shopDomain = extractShopDomain(payload);
  if (!item || !alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  await upsertAlegraItemCacheIfTracked(item);
  const ctx = await buildSyncContext(shopDomain || undefined);
  if (!ctx.webhookItemsEnabled) {
    return { handled: true, skipped: true, reason: "items_webhook_disabled" };
  }
  const result = await syncAlegraItemPayloadToShopify(item, ctx.shopDomain);
  let inventoryResult = null;
  if (item.inventory) {
    inventoryResult = await syncAlegraInventoryPayloadToShopify(
      {
        id: alegraItemId,
        status: typeof item.status === "string" ? item.status : undefined,
        inventory: item.inventory,
      },
      ctx.shopDomain
    );
  }
  return { handled: true, type: "alegra-item", alegraItemId, result, inventoryResult };
}

async function handleAlegraInventory(payload: unknown) {
  const item = extractAlegraData(payload);
  const alegraItemId = item?.id ? String(item.id) : undefined;
  const shopDomain = extractShopDomain(payload);
  if (!item || !alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  await upsertAlegraItemCacheIfTracked(item);
  const result = await syncAlegraInventoryPayloadToShopify(
    {
      id: alegraItemId,
      status: typeof item.status === "string" ? item.status : undefined,
      inventory: item.inventory,
    },
    shopDomain || undefined
  );
  return { handled: true, type: "alegra-inventory", alegraItemId, result };
}

function extractAlegraData(payload: unknown): AlegraItem | undefined {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  return data ? (data as AlegraItem) : undefined;
}

function buildLogMeta(event: WebhookEvent) {
  const base = {
    request: {
      eventType: event.eventType,
    } as JsonObject,
  };
  if (event.meta) {
    base.request.meta = event.meta;
  }

  if (event.source === "shopify") {
    const payload = asRecord(event.payload);
    const orderId = asStringId(payload?.id);
    if (orderId) {
      base.request.orderId = orderId;
    }
    if (event.eventType.startsWith("orders/")) {
      return {
        ...base,
        entity: "order",
        direction: "shopify->alegra",
        message: "Order webhook processed",
      };
    }
    if (event.eventType.startsWith("refund")) {
      return {
        ...base,
        entity: "refund",
        direction: "shopify->alegra",
        message: "Refund webhook processed",
      };
    }
    if (event.eventType.startsWith("inventory")) {
      return {
        ...base,
        entity: "inventory",
        direction: "shopify->alegra",
        message: "Inventory webhook processed",
      };
    }
    return {
      ...base,
      entity: "product",
      direction: "shopify->alegra",
      message: "Product webhook processed",
    };
  }

  const alegraData = extractAlegraData(event.payload);
  const alegraItemId = alegraData ? asStringId(alegraData.id) : undefined;
  if (alegraItemId) {
    base.request.alegraItemId = alegraItemId;
  }

  if (event.eventType.startsWith("inventory")) {
    return {
      ...base,
      entity: "inventory",
      direction: "alegra->shopify",
      message: "Inventory webhook processed",
    };
  }

  return {
    ...base,
    entity: "product",
    direction: "alegra->shopify",
    message: "Item webhook processed",
  };
}
