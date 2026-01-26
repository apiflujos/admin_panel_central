import { buildSyncContext } from "./sync-context";
import {
  saveMapping,
  getMappingByAlegraId,
  updateMappingMetadata,
} from "./mapping.service";

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
  return syncAlegraItemPayloadToShopify(item);
}

export async function syncAlegraItemPayloadToShopify(item: AlegraItem) {
  const ctx = await buildSyncContext();
  const alegraItemId = String(item.id);

  const mapped = await getMappingByAlegraId("item", alegraItemId);
  const identifiers = extractIdentifiers(item);
  const availableQuantity = resolveAvailableQuantity(
    item.inventory,
    ctx.alegraWarehouseId
  );
  const statusInactive = item.status && item.status.toLowerCase() === "inactive";
  const publishEligible =
    !statusInactive && (ctx.publishOnStock ? availableQuantity > 0 : true);
  const desiredPublish =
    ctx.autoPublishStatus === "active" ? publishEligible : false;
  const itemPrice = resolvePrice(item.price);

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
      const result = await ctx.shopify.updateVariantPrice(
        matched.variantId,
        itemPrice ? String(itemPrice) : "0"
      );
      if (matched.productId && ctx.autoPublishOnWebhook) {
        await ctx.shopify.updateProductStatus(matched.productId, desiredPublish);
      }
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

    return { created: true, productId };
  }

  if (!mapped.shopifyId) {
    return { handled: false, reason: "missing_shopify_variant_id" };
  }

  const result = await ctx.shopify.updateVariantPrice(
    mapped.shopifyId,
    itemPrice ? String(itemPrice) : "0"
  );

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    await ctx.shopify.updateProductStatus(mapped.shopifyProductId, desiredPublish);
  }

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
    return { handled: false, reason: "missing_mapping" };
  }

  if (!ctx.shopifyLocationId) {
    return { handled: false, reason: "missing_location_id" };
  }

  const availableQuantity = resolveAvailableQuantity(
    payload.inventory,
    ctx.alegraWarehouseId
  );
  if (availableQuantity === null) {
    return { handled: false, reason: "missing_available_quantity" };
  }

  const result = await ctx.shopify.setInventoryOnHand(
    mapped.shopifyInventoryItemId,
    ctx.shopifyLocationId,
    availableQuantity
  );

  if (mapped.shopifyProductId && ctx.autoPublishOnWebhook) {
    let itemStatus = payload.status;
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
    await ctx.shopify.updateProductStatus(mapped.shopifyProductId, desiredPublish);
  }

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
  price: AlegraItem["price"]
): number | null {
  if (typeof price === "number") {
    return price;
  }
  if (Array.isArray(price) && price.length > 0) {
    const first = price[0];
    if (typeof first?.price === "number") {
      return first.price;
    }
  }
  return null;
}

function resolveAvailableQuantity(
  inventory: AlegraItem["inventory"] | AlegraInventoryPayload["inventory"] | undefined,
  warehouseId?: string
) {
  if (!inventory) {
    return null;
  }
  if (warehouseId && inventory.warehouses) {
    const match = inventory.warehouses.find(
      (warehouse) => String(warehouse.id) === warehouseId
    );
    if (typeof match?.availableQuantity === "number") {
      return match.availableQuantity;
    }
  }
  if (typeof inventory.availableQuantity === "number") {
    return inventory.availableQuantity;
  }
  return null;
}
