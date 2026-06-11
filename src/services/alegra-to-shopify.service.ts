import { buildSyncContext } from "./sync-context";
import { saveMapping, getMappingByAlegraId, updateMappingMetadata } from "./mapping.service";
import { upsertProduct } from "./products.service";
import { createSyncLog } from "./logs.service";
import {
  extractAlegraCustomFieldValue,
  extractAlegraIdentifiers,
  isAlegraStatusInactive,
  resolveDesiredPricing,
  resolveAlegraAvailableQuantity,
  resolvePublishEligibility,
  shouldSkipAlegraInventoryByWarehouse,
} from "../../packages/domain/src";

export type AlegraItem = {
  id: string | number;
  name?: string;
  reference?: string;
  code?: string;
  barcode?: string;
  images?: Array<{ url?: string } | string>;
  customFields?: Array<{ name?: string; label?: string; value?: string }>;
  status?: string;
  price?: number | Array<{ idPriceList?: number; price?: number }>;
  tax?: Array<{ percentage?: string | number }>;
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

const normalizeImageUrls = (images: Array<{ url?: string } | string> = []) =>
  images
    .map((image) => (typeof image === "string" ? image : image?.url))
    .filter((url): url is string => typeof url === "string" && url.length > 0);

export async function syncAlegraItemToShopify(alegraItemId: string, shopDomain?: string) {
  const ctx = await buildSyncContext(shopDomain);
  const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds) ? ctx.alegraWarehouseIds : [];
  await upsertProduct({
    ...buildAlegraProductInput(item, {
      warehouseIds: allowedWarehouseIds,
      source: "alegra",
    }),
    shopDomain: ctx.shopDomain,
  });
  if (!ctx.syncEnabled) {
    return { skipped: true, reason: "sync_disabled" };
  }
  if (ctx.onlyActiveItems) {
    const statusValue = item?.status || "";
    if (isAlegraStatusInactive(statusValue)) {
      return { skipped: true, reason: "inactive_item" };
    }
  }
  return syncAlegraItemPayloadToShopify(item, ctx.shopDomain);
}

export async function syncAlegraItemPayloadToShopify(item: AlegraItem, shopDomain?: string) {
  const ctx = await buildSyncContext(shopDomain);
  const alegraItemId = String(item.id);
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds) ? ctx.alegraWarehouseIds : [];

  if (shouldSkipAlegraInventoryByWarehouse(item.inventory, allowedWarehouseIds)) {
    return { skipped: true, reason: "warehouse_filtered" };
  }

  const mapped = await getMappingByAlegraId("item", alegraItemId);
  const identifiers = extractAlegraIdentifiers(item);
  const availableQuantity = resolveAlegraAvailableQuantity(item.inventory, allowedWarehouseIds);
  const effectiveQuantity = availableQuantity ?? 0;
  const statusInactive = isAlegraStatusInactive(item.status);
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
  const publishEligible = resolvePublishEligibility({
    status: item.status,
    availableQuantity: effectiveQuantity,
    publishOnStock: ctx.publishOnStock,
  });
  const desiredPublish = ctx.autoPublishStatus === "active" ? publishEligible : false;
  const resolvedShopifyStatus = ctx.autoPublishOnWebhook ? (desiredPublish ? "active" : "draft") : null;
  const itemPricing = resolvePrice(item.price, ctx, parseTaxRate(item.tax));

  if (!mapped) {
    const matched = await resolveVariantByIdentifiers(ctx, identifiers);
    if (matched) {
      if (!ctx.updateInShopify) {
        return { skipped: true, reason: "update_disabled", matched: true };
      }
      await saveMapping({
        entity: "item",
        alegraId: String(alegraItemId),
        shopifyId: matched.variantId,
        shopifyProductId: matched.productId,
        shopifyInventoryItemId: matched.inventoryItemId,
        metadata: { sku: matched.sku },
      });
      const result = await withRetry(
        () => ctx.shopify.updateVariantPrice(matched.variantId, itemPricing.price, itemPricing.compareAtPrice),
        { label: "updateVariantPrice" }
      );
      if (matched.productId && ctx.autoPublishOnWebhook) {
        const productId = matched.productId;
        await withRetry(() => ctx.shopify.updateProductStatus(productId, desiredPublish), {
          label: "updateProductStatus",
        });
      }
      await upsertProduct({
        ...baseProductInput,
        shopDomain: ctx.shopDomain,
        shopifyId: matched.productId,
        statusShopify: resolvedShopifyStatus,
      });
      return { updated: true, matched: true, result };
    }
    if (!ctx.createInShopify) {
      return { skipped: true, reason: "create_disabled" };
    }
    const created = await ctx.shopify.createProductFromItem({
      title: item.name || `Alegra Item ${alegraItemId}`,
      sku:
        item.reference ||
        item.code ||
        item.barcode ||
        extractAlegraCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
        undefined,
      price: itemPricing.price,
      publish: ctx.autoPublishOnWebhook ? desiredPublish : false,
      trackInventory: ctx.trackInventory,
      allowOversell: ctx.allowOversell,
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

    if (productId && ctx.includeImages) {
      const urls = normalizeImageUrls(item.images || []);
      if (urls.length) {
        try {
          await withRetry(() => ctx.shopify.addProductImagesByUrl(productId, urls), {
            label: "addProductImages",
            retries: 1,
          });
        } catch (error) {
          await createSyncLog({
            entity: "product_images",
            direction: "alegra->shopify",
            status: "warn",
            message:
              error instanceof Error
                ? `No se pudieron agregar fotos: ${error.message}`
                : "No se pudieron agregar fotos",
            request: { alegraItemId, shopifyProductId: productId },
          });
        }
      }
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
  if (!ctx.updateInShopify) {
    return { skipped: true, reason: "update_disabled" };
  }

  const variantId = mapped.shopifyId;
  const result = await withRetry(() => ctx.shopify.updateVariantPrice(variantId, itemPricing.price, itemPricing.compareAtPrice), {
    label: "updateVariantPrice",
  });

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    const productId = mapped.shopifyProductId;
    await withRetry(() => ctx.shopify.updateProductStatus(productId, desiredPublish), { label: "updateProductStatus" });
  }
  await upsertProduct({
    ...baseProductInput,
    shopDomain: ctx.shopDomain,
    shopifyId: mapped.shopifyProductId,
    statusShopify: resolvedShopifyStatus,
  });

  return { updated: true, result };
}

export async function syncAlegraInventoryToShopify(payload: AlegraInventoryPayload, shopDomain?: string) {
  const alegraItemId = payload.id ? String(payload.id) : undefined;
  if (!alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }
  return syncAlegraInventoryPayloadToShopify(
    {
      id: alegraItemId,
      inventory: payload.inventory,
    },
    shopDomain
  );
}

export async function syncAlegraInventoryPayloadToShopify(payload: AlegraInventoryPayload, shopDomain?: string) {
  const alegraItemId = payload.id ? String(payload.id) : undefined;
  if (!alegraItemId) {
    return { handled: false, reason: "missing_item_id" };
  }

  const ctx = await buildSyncContext(shopDomain);
  const allowedWarehouseIds = Array.isArray(ctx.alegraWarehouseIds) ? ctx.alegraWarehouseIds : [];
  const availableQuantity = resolveAlegraAvailableQuantity(payload.inventory, allowedWarehouseIds);
  if (!ctx.updateInShopify) {
    await upsertProduct({
      shopDomain: ctx.shopDomain,
      alegraId: alegraItemId,
      inventoryQuantity: availableQuantity ?? undefined,
      statusAlegra: payload.status || null,
      source: "alegra",
    });
    return { handled: true, skipped: true, reason: "update_disabled" };
  }
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
    const identifiers = extractAlegraIdentifiers(item);
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

  if (shouldSkipAlegraInventoryByWarehouse(payload.inventory, allowedWarehouseIds)) {
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
    if (isAlegraStatusInactive(itemStatus)) {
      return { handled: true, skipped: true, reason: "inactive_item" };
    }
  }

  const result = await withRetry(() => ctx.shopify.setInventoryOnHand(inventoryItemId, locationId, availableQuantity), {
    label: "setInventoryOnHand",
  });

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    const productId = mapped.shopifyProductId;
    if (typeof itemStatus !== "string") {
      const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
      itemStatus = item?.status;
    }
    const publishEligible = resolvePublishEligibility({
      status: itemStatus,
      availableQuantity,
      publishOnStock: ctx.publishOnStock,
    });
    const desiredPublish = ctx.autoPublishStatus === "active" ? publishEligible : false;
    await withRetry(() => ctx.shopify.updateProductStatus(productId, desiredPublish), { label: "updateProductStatus" });
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

export async function syncAlegraInventoryById(alegraItemId: string, shopDomain?: string) {
  const ctx = await buildSyncContext(shopDomain);
  const item = (await ctx.alegra.getItem(alegraItemId)) as AlegraItem;
  const id = item?.id ? String(item.id) : alegraItemId;
  return syncAlegraInventoryPayloadToShopify(
    {
      id,
      inventory: item.inventory,
    },
    ctx.shopDomain
  );
}

function resolveItemSku(item: AlegraItem) {
  return (
    item.reference ||
    item.code ||
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
      : resolveAlegraAvailableQuantity(item.inventory, warehouseIds);
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
    payloadJson: item,
  };
}

async function resolveVariantByIdentifiers(ctx: Awaited<ReturnType<typeof buildSyncContext>>, identifiers: string[]) {
  const normalizedIdentifiers = Array.from(
    new Set(
      identifiers
        .map((identifier) => String(identifier || "").trim())
        .filter(Boolean)
    )
  );
  for (const identifier of normalizedIdentifiers) {
    const exactSku = await ctx.shopify.findVariantBySku(identifier);
    const exactNode = exactSku.productVariants.edges[0]?.node;
    if (exactNode?.id) {
      return {
        variantId: exactNode.id,
        productId: exactNode.product?.id,
        inventoryItemId: exactNode.inventoryItem?.id,
        sku: exactNode.sku || identifier,
      };
    }
  }
  for (const identifier of normalizedIdentifiers) {
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

function parseTaxRate(taxes?: Array<{ percentage?: string | number }>): number {
  if (!Array.isArray(taxes) || !taxes.length) {
    return 0;
  }
  const parsed = Number(String(taxes[0]?.percentage ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function withVat(value: number, taxRate: number): number {
  if (!Number.isFinite(taxRate) || taxRate <= 0) {
    return value;
  }
  return value * (1 + taxRate / 100);
}

function resolvePrice(
  price: AlegraItem["price"],
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  taxRate: number
): { price: string; compareAtPrice: string | null } {
  if (typeof price === "number") {
    return { price: String(withVat(price, taxRate)), compareAtPrice: null };
  }
  if (Array.isArray(price) && price.length > 0) {
    const matchByList = (listId?: string) => {
      if (!listId) return null;
      const normalized = String(listId);
      return price.find((entry) => String(entry?.idPriceList || "") === normalized) || null;
    };
    const general = matchByList(ctx.priceListGeneralId);
    const discount = matchByList(ctx.priceListDiscountId);
    const first = price[0];
    const generalPriceRaw =
      typeof general?.price === "number" ? general.price : typeof first?.price === "number" ? first.price : 0;
    const discountPriceRaw = typeof discount?.price === "number" ? discount.price : 0;
    const generalPrice = withVat(generalPriceRaw, taxRate);
    const discountPrice = withVat(discountPriceRaw, taxRate);
    const desired = resolveDesiredPricing({
      priceWithVat: generalPrice,
      discountPriceWithVat: discountPrice,
      general: generalPrice,
      discountBeforeVat: discountPrice,
    });
    return {
      price: desired.price ?? "0",
      compareAtPrice: desired.compareAtPrice,
    };
  }
  return { price: "0", compareAtPrice: null };
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
