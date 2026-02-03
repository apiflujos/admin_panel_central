import { buildSyncContext } from "./sync-context";
import {
  saveMapping,
  getMappingByAlegraId,
  updateMappingMetadata,
} from "./mapping.service";
import { upsertProduct } from "./products.service";
import { createSyncLog } from "./logs.service";

export type AlegraItem = {
  id: string | number;
  name?: string;
  reference?: string;
  code?: string;
  barcode?: string;
  customFields?: Array<{ name?: string; label?: string; value?: string }>;
  status?: string;
  price?: number | Array<{ idPriceList?: number; price?: number }>;
  inventory?: {
    availableQuantity?: number;
    warehouses?: Array<{ id: number; availableQuantity?: number }>;
  };
};

export type AlegraInventoryPayload = {
  id?: string | number;
  status?: string;
  inventory?: {
    availableQuantity?: number;
    warehouses?: Array<{ id: number; availableQuantity?: number }>;
  };
};

export async function syncAlegraItemToShopify(alegraItemId: string) {
  const ctx = await buildSyncContext();
  const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds)
    ? ctx.alegraWarehouseIds
    : [];
  await upsertProduct(
    {
      ...buildAlegraProductInput(item, {
        warehouseIds: allowedWarehouseIds,
        source: "alegra",
      }),
      shopDomain: ctx.shopDomain,
    }
  );
  if (!ctx.syncEnabled) {
    return { skipped: true, reason: "sync_disabled" };
  }
  if (ctx.onlyActiveItems) {
    const statusValue = item?.status || "";
    if (String(statusValue).toLowerCase() === "inactive") {
      return { skipped: true, reason: "inactive_item" };
    }
  }
  return syncAlegraItemPayloadToShopify(item);
}

export async function syncAlegraItemPayloadToShopify(item: AlegraItem) {
  const ctx = await buildSyncContext();
  const alegraItemId = String(item.id);
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds)
    ? ctx.alegraWarehouseIds
    : [];

  if (shouldSkipByWarehouse(item, allowedWarehouseIds)) {
    return { skipped: true, reason: "warehouse_filtered" };
  }

  const mapped = await getMappingByAlegraId("item", alegraItemId);
  const identifiers = extractIdentifiers(item);
  const availableQuantity = resolveAvailableQuantity(item.inventory, allowedWarehouseIds);
  const effectiveQuantity = availableQuantity ?? 0;
  const statusInactive = item.status && item.status.toLowerCase() === "inactive";
  const baseProductInput = buildAlegraProductInput(item, {
    warehouseIds: allowedWarehouseIds,
    availableQuantity,
    source: "alegra",
  });
  await upsertProduct({ ...baseProductInput, shopDomain: ctx.shopDomain });
  if (!ctx.syncEnabled) {
    return { skipped: true, reason: "sync_disabled" };
  }
  if (ctx.onlyActiveItems && statusInactive) {
    return { skipped: true, reason: "inactive_item" };
  }
  const publishEligible =
    !statusInactive && (ctx.publishOnStock ? effectiveQuantity > 0 : true);
  const desiredPublish =
    ctx.autoPublishStatus === "active" ? publishEligible : false;
  const resolvedShopifyStatus = ctx.autoPublishOnWebhook
    ? desiredPublish
      ? "active"
      : "draft"
    : null;
  const itemPrice = resolvePrice(item.price, ctx);

  if (!mapped) {
    const matched = await resolveVariantByIdentifiers(ctx, identifiers);
    if (matched) {
      await saveMapping({
        entity: "item",
        alegraId: String(alegraItemId),
        shopifyId: matched.variantId,
        shopifyProductId: matched.productId,
        shopifyInventoryItemId: matched.inventoryItemId,
        metadata: { sku: matched.sku },
      });
      const result = await withRetry(
        () =>
          ctx.shopify.updateVariantPrice(
            matched.variantId,
            itemPrice ? String(itemPrice) : "0"
          ),
        { label: "updateVariantPrice" }
      );
      if (matched.productId && ctx.autoPublishOnWebhook) {
        const productId = matched.productId;
        await withRetry(
          () => ctx.shopify.updateProductStatus(productId, desiredPublish),
          { label: "updateProductStatus" }
        );
      }
      await upsertProduct({
        ...baseProductInput,
        shopDomain: ctx.shopDomain,
        shopifyId: matched.productId,
        statusShopify: resolvedShopifyStatus,
      });
      return { updated: true, matched: true, result };
    }
    const created = await ctx.shopify.createProductFromItem({
      title: item.name || `Alegra Item ${alegraItemId}`,
      sku:
        item.reference ||
        item.code ||
        item.barcode ||
        extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
        undefined,
      price: itemPrice ? String(itemPrice) : "0",
      publish: ctx.autoPublishOnWebhook ? desiredPublish : false,
    });

    const productId = created.productCreate?.product?.id;
    const variant = created.productCreate?.product?.variants?.edges?.[0]?.node;
    if (productId && variant?.id) {
      await saveMapping({
        entity: "item",
        alegraId: String(alegraItemId),
        shopifyId: variant.id,
        shopifyProductId: productId,
        shopifyInventoryItemId: variant.inventoryItem?.id,
        metadata: { sku: variant.sku },
      });
    }
    await upsertProduct({
      ...baseProductInput,
      shopDomain: ctx.shopDomain,
      shopifyId: productId,
      statusShopify: resolvedShopifyStatus,
    });

    return { created: true, productId };
  }

  if (!mapped.shopifyId) {
    return { handled: false, reason: "missing_shopify_variant_id" };
  }

  const variantId = mapped.shopifyId;
  const result = await withRetry(
    () => ctx.shopify.updateVariantPrice(variantId, itemPrice ? String(itemPrice) : "0"),
    { label: "updateVariantPrice" }
  );

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    const productId = mapped.shopifyProductId;
    await withRetry(
      () => ctx.shopify.updateProductStatus(productId, desiredPublish),
      { label: "updateProductStatus" }
    );
  }
  await upsertProduct({
    ...baseProductInput,
    shopDomain: ctx.shopDomain,
    shopifyId: mapped.shopifyProductId,
    statusShopify: resolvedShopifyStatus,
  });

  return { updated: true, result };
}

export async function syncAlegraInventoryToShopify(payload: AlegraInventoryPayload) {
  const alegraItemId = payload.id ? String(payload.id) : undefined;
  if (!alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  return syncAlegraInventoryPayloadToShopify({
    id: alegraItemId,
    inventory: payload.inventory,
  });
}

export async function syncAlegraInventoryPayloadToShopify(
  payload: AlegraInventoryPayload
) {
  const alegraItemId = payload.id ? String(payload.id) : undefined;
  if (!alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }

  const ctx = await buildSyncContext();
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds)
    ? ctx.alegraWarehouseIds
    : [];
  const availableQuantity = resolveAvailableQuantity(payload.inventory, allowedWarehouseIds);
  if (!ctx.syncEnabled) {
    await upsertProduct({
      shopDomain: ctx.shopDomain,
      alegraId: alegraItemId,
      inventoryQuantity: availableQuantity ?? undefined,
      statusAlegra: payload.status || null,
      source: "alegra",
    });
    return { handled: true, skipped: true, reason: "sync_disabled" };
  }
  let mapped = await getMappingByAlegraId("item", alegraItemId);
  if (!mapped || !mapped.shopifyInventoryItemId) {
    const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
    const identifiers = extractIdentifiers(item);
    const matched = await resolveVariantByIdentifiers(ctx, identifiers);
    if (matched) {
      await saveMapping({
        entity: "item",
        alegraId: String(alegraItemId),
        shopifyId: matched.variantId,
        shopifyProductId: matched.productId,
        shopifyInventoryItemId: matched.inventoryItemId,
        metadata: { sku: matched.sku },
      });
      mapped = await getMappingByAlegraId("item", alegraItemId);
    }
  }
  if (!mapped || !mapped.shopifyInventoryItemId) {
    await createSyncLog({
      entity: "inventory",
      direction: "alegra->shopify",
      status: "warn",
      message: "Missing Shopify mapping for inventory",
      request: { alegraItemId },
    });
    return { handled: false, reason: "missing_mapping" };
  }

  if (!ctx.shopifyLocationId) {
    await createSyncLog({
      entity: "inventory",
      direction: "alegra->shopify",
      status: "warn",
      message: "Missing Shopify locationId",
      request: { alegraItemId },
    });
    return { handled: false, reason: "missing_location_id" };
  }

  if (shouldSkipByWarehouse({ id: alegraItemId, inventory: payload.inventory }, allowedWarehouseIds)) {
    return { handled: true, skipped: true, reason: "warehouse_filtered" };
  }
  if (availableQuantity === null) {
    await createSyncLog({
      entity: "inventory",
      direction: "alegra->shopify",
      status: "warn",
      message: "Missing available quantity",
      request: { alegraItemId },
    });
    return { handled: false, reason: "missing_available_quantity" };
  }

  const inventoryItemId = mapped.shopifyInventoryItemId;
  const locationId = ctx.shopifyLocationId;
  let itemStatus = payload.status;
  if (ctx.onlyActiveItems) {
    if (typeof itemStatus !== "string") {
      const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
      itemStatus = item?.status;
    }
    if (itemStatus && String(itemStatus).toLowerCase() === "inactive") {
      return { handled: true, skipped: true, reason: "inactive_item" };
    }
  }

  const result = await withRetry(
    () => ctx.shopify.setInventoryOnHand(inventoryItemId, locationId, availableQuantity),
    { label: "setInventoryOnHand" }
  );

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    const productId = mapped.shopifyProductId;
    if (typeof itemStatus !== "string") {
      const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
      itemStatus = item?.status;
    }
    const statusInactive =
      itemStatus && String(itemStatus).toLowerCase() === "inactive";
    const publishEligible =
      !statusInactive && (ctx.publishOnStock ? availableQuantity > 0 : true);
    const desiredPublish =
      ctx.autoPublishStatus === "active" ? publishEligible : false;
    await withRetry(
      () => ctx.shopify.updateProductStatus(productId, desiredPublish),
      { label: "updateProductStatus" }
    );
  }

  await upsertProduct({
    shopDomain: ctx.shopDomain,
    alegraId: alegraItemId,
    inventoryQuantity: availableQuantity,
    statusAlegra: itemStatus || null,
    source: "alegra",
  });

  await updateMappingMetadata("item", alegraItemId, { lastQuantity: availableQuantity });
  return { handled: true, result };
}

export async function syncAlegraInventoryById(alegraItemId: string) {
  const ctx = await buildSyncContext();
  const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
  const id = item?.id ? String(item.id) : alegraItemId;
  return syncAlegraInventoryPayloadToShopify({
    id,
    inventory: item.inventory,
  });
}

function extractIdentifiers(item: AlegraItem) {
  const values = [
    item.barcode,
    item.code,
    item.reference,
    extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]),
  ]
    .map((value) => (value || "").trim())
    .filter((value) => value.length);
  return Array.from(new Set(values));
}

function extractCustomFieldValue(item: AlegraItem, keys: string[]) {
  if (!Array.isArray(item.customFields)) return "";
  const lowered = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return lowered.includes(name);
  });
  return String(match?.value || "").trim();
}

function resolveItemSku(item: AlegraItem) {
  return (
    item.reference ||
    item.code ||
    item.barcode ||
    extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
    null
  );
}

function resolveItemTimestamp(item: AlegraItem) {
  const raw =
    (item as { updated_at?: string; updatedAt?: string }).updated_at ||
    (item as { updated_at?: string; updatedAt?: string }).updatedAt ||
    (item as { created_at?: string; createdAt?: string }).created_at ||
    (item as { created_at?: string; createdAt?: string }).createdAt;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function buildAlegraProductInput(
  item: AlegraItem,
  options: {
    warehouseIds?: string[];
    availableQuantity?: number | null;
    source?: string;
  } = {}
) {
  const warehouseIds = Array.isArray(options.warehouseIds) ? options.warehouseIds : [];
  const availableQuantity =
    typeof options.availableQuantity === "number"
      ? options.availableQuantity
      : resolveAvailableQuantity(item.inventory, warehouseIds);
  const resolvedWarehouseIds =
    Array.isArray(item.inventory?.warehouses) && item.inventory?.warehouses?.length
      ? item.inventory.warehouses.map((warehouse) => String(warehouse.id)).filter(Boolean)
      : warehouseIds;
  return {
    alegraId: item.id,
    name: item.name || null,
    reference: item.reference || item.code || item.barcode || null,
    sku: resolveItemSku(item),
    statusAlegra: item.status || null,
    inventoryQuantity: typeof availableQuantity === "number" ? availableQuantity : null,
    warehouseIds: resolvedWarehouseIds.length ? resolvedWarehouseIds : null,
    sourceUpdatedAt: resolveItemTimestamp(item),
    source: options.source || "alegra",
  };
}

async function resolveVariantByIdentifiers(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  identifiers: string[]
) {
  for (const identifier of identifiers) {
    const result = await ctx.shopify.findVariantByIdentifier(identifier);
    const node = result.productVariants.edges[0]?.node;
    if (node?.id) {
      return {
        variantId: node.id,
        productId: node.product?.id,
        inventoryItemId: node.inventoryItem?.id,
        sku: node.sku || identifier,
      };
    }
  }
  return null;
}

function resolvePrice(
  price: AlegraItem["price"],
  ctx: Awaited<ReturnType<typeof buildSyncContext>>
): number | null {
  if (typeof price === "number") {
    return price;
  }
  if (Array.isArray(price) && price.length > 0) {
    const matchByList = (listId?: string) => {
      if (!listId) return null;
      const normalized = String(listId);
      return (
        price.find((entry) => String(entry?.idPriceList || "") === normalized) || null
      );
    };
    const discount = matchByList(ctx.priceListDiscountId);
    if (discount && typeof discount.price === "number") return discount.price;
    const wholesale = matchByList(ctx.priceListWholesaleId);
    if (wholesale && typeof wholesale.price === "number") return wholesale.price;
    const general = matchByList(ctx.priceListGeneralId);
    if (general && typeof general.price === "number") return general.price;
    const first = price[0];
    if (typeof first?.price === "number") return first.price;
  }
  return null;
}

function resolveAvailableQuantity(
  inventory: AlegraItem["inventory"] | AlegraInventoryPayload["inventory"] | undefined,
  warehouseIds: string[] = []
) {
  if (!inventory) {
    return null;
  }
  if (warehouseIds.length && inventory.warehouses) {
    const total = inventory.warehouses
      .filter((warehouse) => warehouseIds.includes(String(warehouse.id)))
      .reduce((acc, warehouse) => acc + Number(warehouse.availableQuantity || 0), 0);
    return Number.isFinite(total) ? total : null;
  }
  if (typeof inventory.availableQuantity === "number") {
    return inventory.availableQuantity;
  }
  return null;
}

function shouldSkipByWarehouse(item: AlegraItem, warehouseIds: string[]) {
  if (!warehouseIds.length) return false;
  const warehouses = Array.isArray(item.inventory?.warehouses) ? item.inventory.warehouses : [];
  if (!warehouses.length) return false;
  return !warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; delayMs?: number; label?: string } = {}
) {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 250;
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
