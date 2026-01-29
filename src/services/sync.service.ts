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

type WebhookEvent = {
  source: "shopify" | "alegra";
  eventType: string;
  payload: unknown;
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

async function handleShopifyOrder(payload: unknown) {
  // TODO: map order to Alegra contact + invoice sync workflow.
  const result = await syncShopifyOrderToAlegra(
    (payload || {}) as Record<string, unknown>
  );
  return { handled: true, type: "order", result };
}

async function handleShopifyRefund(payload: unknown) {
  const ctx = await buildSyncContext();
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
  // TODO: map inventory event to Alegra stock sync (requires delta or lookup).
  return { handled: true, type: "inventory", payload };
}

async function handleShopifyProduct(payload: unknown) {
  // TODO: map product changes to Alegra items + variant mapping.
  return { handled: true, type: "product", payload };
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
