import {
  syncAlegraInventoryPayloadToShopify,
  syncAlegraItemPayloadToShopify,
  type AlegraItem,
} from "./alegra-to-shopify.service";
import { upsertAlegraItemCacheIfTracked } from "./alegra-items-cache.service";
import {
  syncShopifyOrderToAlegra,
  createInventoryAdjustmentFromRefund,
} from "./shopify-to-alegra.service";
import { createSyncLog } from "./logs.service";
import { buildSyncContext } from "./sync-context";
import { upsertProduct } from "./products.service";
import {
  getMappingByShopifyId,
  getMappingByShopifyInventoryItemId,
  updateMappingMetadata,
} from "./mapping.service";

type WebhookEvent = {
  source: "shopify" | "alegra";
  eventType: string;
  payload: unknown;
  meta?: Record<string, unknown>;
};

export async function enqueueWebhookEvent(event: WebhookEvent) {
  // TODO: persist webhook event and enqueue a background job.
  try {
    let result: unknown;
    let meta = buildLogMeta(event);
    if (event.source === "shopify") {
      result = await processShopifyWebhook(event.eventType, event.payload);
    }
    if (event.source === "alegra") {
      result = await processAlegraWebhook(event.eventType, event.payload);
    }
    await createSyncLog({
      entity: meta.entity,
      direction: meta.direction,
      status: "success",
      message: meta.message,
      request: meta.request,
      response: { result },
    });
    return { status: "queued", event };
  } catch (error) {
    const meta = buildLogMeta(event);
    const message = error instanceof Error ? error.message : "Unhandled error";
    await createSyncLog({
      entity: meta.entity,
      direction: meta.direction,
      status: "fail",
      message,
      request: meta.request,
    });
    throw error;
  }
}

export async function processShopifyWebhook(eventType: string, payload: unknown) {
  switch (eventType) {
    case "orders/create":
    case "orders/updated":
      return handleShopifyOrder(payload);
    case "refunds/create":
      return handleShopifyRefund(payload);
    case "inventory_levels/update":
      return handleShopifyInventory(payload);
    case "products/update":
      return handleShopifyProduct(payload);
    default:
      return { ignored: true, eventType };
  }
}

function extractShopDomain(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const raw = (payload as { __shopDomain?: unknown }).__shopDomain;
  return typeof raw === "string" ? raw : "";
}

async function handleShopifyOrder(payload: unknown) {
  // TODO: map order to Alegra contact + invoice sync workflow.
  const result = await syncShopifyOrderToAlegra(
    (payload || {}) as Record<string, unknown>
  );
  return { handled: true, type: "order", result };
}

async function handleShopifyRefund(payload: unknown) {
  const shopDomain = extractShopDomain(payload);
  const ctx = await buildSyncContext(shopDomain);
  const data = (payload || {}) as Record<string, unknown>;
  try {
    const result = await createInventoryAdjustmentFromRefund(
      data,
      ctx.alegraWarehouseId,
      ctx
    );
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
  const data = (payload || {}) as Record<string, unknown>;
  const shopDomain = extractShopDomain(payload);
  const inventoryItemId = data.inventory_item_id || data.inventoryItemId;
  const availableRaw = data.available ?? data.availableQuantity;
  const available =
    typeof availableRaw === "number" ? availableRaw : Number(availableRaw);
  if (!inventoryItemId || !Number.isFinite(available)) {
    return { handled: false, reason: "missing_inventory_payload" };
  }

  const mapping = await getMappingByShopifyInventoryItemId(
    "item",
    String(inventoryItemId)
  );
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

  return { handled: true, type: "inventory", inventoryItemId, available };
}

async function handleShopifyProduct(payload: unknown) {
  const data = (payload || {}) as Record<string, unknown>;
  const shopDomain = extractShopDomain(payload);
  const productId = data.id ? String(data.id) : "";
  if (productId) {
    const variants = Array.isArray(data.variants) ? data.variants : [];
    const firstVariant = variants[0] as Record<string, unknown> | undefined;
    const sku = firstVariant?.sku ? String(firstVariant.sku) : null;
    await upsertProduct({
      shopDomain,
      shopifyId: productId,
      name: data.title ? String(data.title) : null,
      sku,
      reference: sku,
      statusShopify: data.status ? String(data.status) : null,
      sourceUpdatedAt: (data.updated_at as string | undefined) || null,
      source: "shopify",
    });
  }

  const variants = Array.isArray(data.variants) ? data.variants : [];
  for (const variant of variants) {
    const record = variant as Record<string, unknown>;
    const variantId = record.id ? String(record.id) : "";
    const inventoryItemId = record.inventory_item_id
      ? String(record.inventory_item_id)
      : "";
    if (!variantId || !inventoryItemId) continue;
    const mapping = await getMappingByShopifyId("item", variantId);
    if (mapping?.alegraId) {
      await updateMappingMetadata("item", mapping.alegraId, {
        shopifyInventoryItemId: inventoryItemId,
      });
    }
  }

  return { handled: true, type: "product", productId };
}

export async function processAlegraWebhook(eventType: string, payload: unknown) {
  switch (eventType) {
    case "item.created":
    case "item.updated":
      return handleAlegraItem(payload);
    case "inventory.updated":
      return handleAlegraInventory(payload);
    default:
      return { ignored: true, eventType };
  }
}

async function handleAlegraItem(payload: unknown) {
  const item = extractAlegraData(payload);
  const alegraItemId = item?.id ? String(item.id) : undefined;
  if (!item || !alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  await upsertAlegraItemCacheIfTracked(item);
  const ctx = await buildSyncContext();
  if (!ctx.webhookItemsEnabled) {
    return { handled: true, skipped: true, reason: "items_webhook_disabled" };
  }
  const result = await syncAlegraItemPayloadToShopify(item);
  let inventoryResult = null;
  if (item.inventory) {
    inventoryResult = await syncAlegraInventoryPayloadToShopify({
      id: alegraItemId,
      status: typeof item.status === "string" ? item.status : undefined,
      inventory: item.inventory,
    });
  }
  return { handled: true, type: "alegra-item", alegraItemId, result, inventoryResult };
}

async function handleAlegraInventory(payload: unknown) {
  const item = extractAlegraData(payload);
  const alegraItemId = item?.id ? String(item.id) : undefined;
  if (!item || !alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  await upsertAlegraItemCacheIfTracked(item);
  const result = await syncAlegraInventoryPayloadToShopify({
    id: alegraItemId,
    status: typeof item.status === "string" ? item.status : undefined,
    inventory: item.inventory,
  });
  return { handled: true, type: "alegra-inventory", alegraItemId, result };
}

function extractAlegraData(payload: unknown): AlegraItem | undefined {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      return record.data as AlegraItem;
    }
  }
  return undefined;
}

function buildLogMeta(event: WebhookEvent) {
  const base = {
    request: {
      eventType: event.eventType,
    } as Record<string, unknown>,
  };
  if (event.meta) {
    base.request.meta = event.meta;
  }

  if (event.source === "shopify") {
    const payload = event.payload as Record<string, unknown> | undefined;
    const orderId =
      typeof payload?.id === "number" || typeof payload?.id === "string"
        ? String(payload.id)
        : undefined;
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
  const alegraItemId =
    alegraData && (alegraData.id as string | number | undefined)
      ? String(alegraData.id)
      : undefined;
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
