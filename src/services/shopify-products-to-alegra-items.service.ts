import { buildSyncContext } from "./sync-context";
import { createSyncLog } from "./logs.service";
import { getMappingByShopifyId, getMappingByShopifyInventoryItemId, saveMapping } from "./mapping.service";
import { getStoreConfigForDomain } from "./store-configs.service";
import { clearSyncCheckpoint, getSyncCheckpoint, saveSyncCheckpoint } from "./sync-checkpoints.service";
import type { ShopifyProduct } from "../connectors/shopify";
import { getPool } from "../db";
import {
  buildAlegraItemDisplayName,
  coerceDecimal,
  pickShopifyVariantIdentifier,
  resolveAlegraWarehouseQuantityFromRecord,
} from "../../packages/domain/src";

type ProductSyncConfig = {
  enabled: boolean;
  createInAlegra: boolean;
  updateInAlegra: boolean;
  includeInventory: boolean;
  warehouseId?: string;
  matchPriority: Array<"sku" | "barcode">;
};

type ShopifyVariantNode = ShopifyProduct["variants"]["edges"][number]["node"];

const DEFAULT_CONFIG: ProductSyncConfig = {
  enabled: false,
  createInAlegra: false,
  updateInAlegra: false,
  includeInventory: false,
  warehouseId: undefined,
  matchPriority: ["sku"],
};

/**
 * KILL SWITCH DURO — escrituras de ítems a Alegra desde el sync Shopify→Alegra.
 *
 * Este sync (updateItem con el precio de Shopify + maybeAdjustInventory que ajusta
 * el stock de Alegra para igualar el de Shopify) FORZABA a Alegra a copiar precio e
 * inventario de Shopify. Cuando Shopify tenía valores malos (por el bug de resolvePrice
 * y por ceros de inventario), los metía a Alegra, y el rebote Alegra→Shopify colapsaba
 * ambos sistemas. Ver memoria becam-causa-raiz-precios-inventario.
 *
 * Regla "NO tocar Alegra": por omisión NO se escribe NADA a Alegra desde acá.
 * Solo con ALLOW_ALEGRA_ITEM_WRITES=true (y entendiendo el riesgo) se re-habilita.
 */
const alegraItemWritesEnabled = () =>
  String(process.env.ALLOW_ALEGRA_ITEM_WRITES || "")
    .trim()
    .toLowerCase() === "true";

function parseMatchPriority(value: unknown): Array<"sku" | "barcode"> {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) =>
        String(entry || "")
          .trim()
          .toLowerCase()
      )
      .filter((entry): entry is "sku" | "barcode" => entry === "sku" || entry === "barcode");
    if (normalized.length) {
      return Array.from(new Set(normalized));
    }
  }
  const key = String(value || "")
    .trim()
    .toLowerCase();
  if (key === "barcode_sku") return ["barcode", "sku"];
  if (key === "sku_barcode") return ["sku", "barcode"];
  if (key === "barcode") return ["barcode"];
  return ["sku"];
}

function resolveConfigFromStore(store: Record<string, unknown>): ProductSyncConfig {
  const sync = (store?.sync && typeof store.sync === "object" ? store.sync : {}) as Record<string, unknown>;
  const products = (sync.products && typeof sync.products === "object" ? sync.products : {}) as Record<string, unknown>;
  return {
    enabled: Boolean(products.shopifyEnabled),
    createInAlegra: products.createInAlegra !== false && Boolean(products.createInAlegra),
    updateInAlegra: products.updateInAlegra !== false,
    includeInventory: Boolean(products.includeInventory),
    warehouseId:
      typeof products.warehouseId === "string" && products.warehouseId.trim() ? products.warehouseId : undefined,
    matchPriority: parseMatchPriority(products.matchPriority),
  };
}

function pickIdentifier(variant: { sku?: unknown }, _matchPriority: Array<"sku" | "barcode">) {
  return pickShopifyVariantIdentifier(
    {
      sku: typeof variant.sku === "string" ? variant.sku : undefined,
      barcode:
        typeof (variant as { barcode?: unknown }).barcode === "string"
          ? String((variant as { barcode?: unknown }).barcode)
          : undefined,
    },
    _matchPriority
  );
}

function buildAlegraItemName(productTitle: string, variantTitle: string) {
  return buildAlegraItemDisplayName(productTitle, variantTitle);
}

function extractAlegraListItems(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const items = Array.isArray(record.items) ? record.items : Array.isArray(record.data) ? record.data : [];
  return items as Array<Record<string, unknown>>;
}

function isRateLimitError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  if (!message) return false;
  return (
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("rate_limit")
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function findAlegraItemByIdentifier(ctx: Awaited<ReturnType<typeof buildSyncContext>>, identifier: string) {
  const value = String(identifier || "").trim();
  if (!value) return null;
  const baseParams = {
    metadata: true,
    mode: "advanced",
    limit: 5,
    fields: "inventory,barcode,reference,code,name,status,itemVariants,variantAttributes",
  };

  const attempts: Array<Record<string, unknown>> = [
    { ...baseParams, reference: value },
    { ...baseParams, barcode: value },
    { ...baseParams, code: value },
    { ...baseParams, query: `reference:${value}` },
    { ...baseParams, query: `barcode:${value}` },
    { ...baseParams, query: `code:${value}` },
    { ...baseParams, query: value },
  ];

  let rateLimitBackoffMs = 2000;
  for (const params of attempts) {
    try {
      const response = await ctx.alegra.searchItems(params);
      const items = extractAlegraListItems(response);
      const first = items[0];
      const id = first?.id ?? (first as { item?: { id?: string } })?.item?.id;
      if (id === undefined || id === null || String(id).trim() === "") continue;
      const full = await ctx.alegra.getItemWithParams(String(id), {
        mode: "advanced",
        fields: baseParams.fields,
        metadata: true,
      });
      return full as Record<string, unknown>;
    } catch (error) {
      if (isRateLimitError(error)) {
        await sleep(rateLimitBackoffMs);
        rateLimitBackoffMs = Math.min(rateLimitBackoffMs * 2, 16000);
      }
      // try next attempt
    }
  }
  return null;
}

async function findAlegraItemsByExactName(ctx: Awaited<ReturnType<typeof buildSyncContext>>, name: string) {
  const value = String(name || "").trim();
  if (!value) return [];
  try {
    const response = await ctx.alegra.searchItems({
      metadata: true,
      mode: "advanced",
      limit: 20,
      query: value,
      fields: "inventory,barcode,reference,code,name,status,itemVariants,variantAttributes",
    });
    return extractAlegraListItems(response).filter(
      (item) =>
        String(item?.name || "")
          .trim()
          .toLowerCase() === value.toLowerCase()
    );
  } catch {
    return [];
  }
}

function hasAlegraIdentifier(item: Record<string, unknown> | null | undefined) {
  return Boolean(
    String(item?.reference || "").trim() || String(item?.barcode || "").trim() || String(item?.code || "").trim()
  );
}

async function withVariantCreateLock<T>(shopDomain: string, variantId: string, fn: () => Promise<T>) {
  const pool = getPool();
  const client = await pool.connect();
  const lockKey = `${shopDomain}:${variantId}`;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
    } finally {
      client.release();
    }
  }
}

function resolveAlegraWarehouseQuantity(item: Record<string, unknown>, warehouseId: string) {
  const inv = ((item.inventory as Record<string, unknown>) || {}) as {
    availableQuantity?: number;
    quantity?: number;
    warehouses?: Array<{ id?: string | number; availableQuantity?: number; quantity?: number }>;
  };
  return resolveAlegraWarehouseQuantityFromRecord(inv, warehouseId);
}

async function maybeAdjustInventory(params: {
  ctx: Awaited<ReturnType<typeof buildSyncContext>>;
  alegraItemId: string;
  desired: number | null;
  warehouseId?: string;
  includeInventory: boolean;
  observations?: string;
  alegraItem?: Record<string, unknown> | null;
}) {
  const { ctx, alegraItemId, desired, warehouseId, includeInventory, observations } = params;
  if (!includeInventory) return { adjusted: false, reason: "disabled" as const };
  // Kill switch: nunca ajustar el inventario de Alegra desde Shopify (colapsaba el stock).
  if (!alegraItemWritesEnabled()) return { adjusted: false, reason: "alegra_writes_disabled" as const };
  const resolvedWarehouseId = String(warehouseId || "").trim();
  const warehouseNumeric = Number(resolvedWarehouseId);
  if (!resolvedWarehouseId || !Number.isFinite(warehouseNumeric)) {
    return { adjusted: false, reason: "missing_warehouse" as const };
  }
  if (desired === null) {
    return { adjusted: false, reason: "missing_desired" as const };
  }
  const item =
    params.alegraItem ||
    ((await ctx.alegra.getItemWithParams(alegraItemId, {
      mode: "advanced",
      fields: "inventory",
      metadata: true,
    })) as Record<string, unknown>);
  const current = resolveAlegraWarehouseQuantity(item as Record<string, unknown>, resolvedWarehouseId);
  const delta = Math.round((desired - current) * 1000) / 1000;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.0001) {
    return { adjusted: false, reason: "noop" as const, current, desired };
  }
  const adjustmentPayload = {
    date: new Date().toISOString().slice(0, 10),
    observations: observations || "Sync Shopify Productos",
    items: [
      {
        id: Number(alegraItemId),
        quantity: delta,
        observations: observations || "Sync Shopify Productos",
        warehouse: { id: warehouseNumeric },
      },
    ],
  };
  await ctx.alegra.createInventoryAdjustment(adjustmentPayload);
  return { adjusted: true, current, desired, delta };
}

export async function syncShopifyVariantToAlegra(params: {
  ctx: Awaited<ReturnType<typeof buildSyncContext>>;
  shopDomain: string;
  product: { id: string; title: string; status?: string | null };
  variant: ShopifyVariantNode;
  config: ProductSyncConfig;
}) {
  return withVariantCreateLock(params.shopDomain, String(params.variant?.id || "").trim(), async () => {
    const { ctx, shopDomain, product, variant, config } = params;
    const variantId = String(variant?.id || "").trim();
    if (!variantId) return { ok: false, skipped: true, reason: "missing_variant_id" as const };

    const { identifier, sku } = pickIdentifier(variant as unknown as { sku?: unknown }, config.matchPriority);
    if (!identifier) {
      return { ok: false, skipped: true, reason: "missing_identifier" as const, variantId, sku };
    }

    const name = buildAlegraItemName(product.title, variant.title);
    const existingMapping = await getMappingByShopifyId("item", variantId);
    let alegraItemId = existingMapping?.alegraId ? String(existingMapping.alegraId) : "";
    let alegraItem: Record<string, unknown> | null;

    if (alegraItemId) {
      try {
        alegraItem = (await ctx.alegra.getItemWithParams(alegraItemId, {
          mode: "advanced",
          fields: "inventory,barcode,reference,code,name,status,itemVariants,variantAttributes",
          metadata: true,
        })) as Record<string, unknown>;
      } catch {
        alegraItem = null;
      }
    } else {
      alegraItem = await findAlegraItemByIdentifier(ctx, identifier);
      if (alegraItem?.id) {
        alegraItemId = String(alegraItem.id);
      } else {
        const exactNameMatches = await findAlegraItemsByExactName(ctx, name);
        const matchWithIdentifier = exactNameMatches.find((item) => hasAlegraIdentifier(item));
        if (matchWithIdentifier?.id) {
          alegraItem = matchWithIdentifier;
          alegraItemId = String(matchWithIdentifier.id);
        } else if (exactNameMatches.length > 0) {
          await createSyncLog({
            entity: "product",
            direction: "shopify->alegra",
            status: "warn",
            message: "Producto sospechoso en Alegra: nombre exacto existente sin match seguro",
            request: {
              shopDomain,
              productId: product.id,
              variantId,
              identifier,
              name,
              exactNameMatches: exactNameMatches.slice(0, 10).map((item) => ({
                id: item.id,
                reference: item.reference || null,
                barcode: item.barcode || null,
                code: item.code || null,
              })),
            },
          });
          return {
            ok: false,
            skipped: true,
            reason: "ambiguous_existing_name" as const,
            variantId,
            identifier,
          };
        }
      }
    }

    const price = coerceDecimal(variant.price);
    const desiredInventory = config.includeInventory
      ? (coerceDecimal((variant as unknown as { inventoryQuantity?: unknown }).inventoryQuantity) ?? null)
      : null;

    const payload: Record<string, unknown> = {
      name,
      reference: (sku || identifier).trim(),
      ...(price !== null ? { price } : {}),
    };

    const writesEnabled = alegraItemWritesEnabled();
    let action: "created" | "updated" | "skipped";
    if (alegraItemId) {
      if (writesEnabled && config.updateInAlegra) {
        await ctx.alegra.updateItem(alegraItemId, payload);
        action = "updated";
      } else {
        action = "skipped";
      }
    } else {
      if (!writesEnabled || !config.createInAlegra) {
        await createSyncLog({
          entity: "product",
          direction: "shopify->alegra",
          status: "warn",
          message: !writesEnabled
            ? "Escritura a Alegra desactivada (kill switch ALLOW_ALEGRA_ITEM_WRITES)"
            : "Producto sin match en Alegra (crear desactivado)",
          request: { shopDomain, productId: product.id, variantId, identifier, name },
        });
        return {
          ok: false,
          skipped: true,
          reason: (!writesEnabled ? "alegra_writes_disabled" : "create_disabled") as
            | "alegra_writes_disabled"
            | "create_disabled",
          variantId,
          identifier,
        };
      }
      const created = (await ctx.alegra.createItem(payload)) as Record<string, unknown>;
      const createdId = created?.id ? String(created.id) : "";
      if (!createdId) {
        throw new Error("Alegra no devolvió id al crear item.");
      }
      alegraItemId = createdId;
      action = "created";
      await createSyncLog({
        entity: "product",
        direction: "shopify->alegra",
        status: "success",
        message: "Producto creado en Alegra",
        request: { shopDomain, productId: product.id, variantId, identifier, name },
        response: { alegraItemId: createdId },
      });
      try {
        alegraItem = (await ctx.alegra.getItemWithParams(createdId, {
          mode: "advanced",
          fields: "inventory,barcode,reference,code,name,status,itemVariants,variantAttributes",
          metadata: true,
        })) as Record<string, unknown>;
      } catch {
        alegraItem = null;
      }
    }

    await saveMapping({
      entity: "item",
      alegraId: alegraItemId,
      shopifyId: variantId,
      shopifyProductId: product.id,
      shopifyInventoryItemId: variant.inventoryItem?.id || undefined,
      metadata: {
        sku: sku || undefined,
        identifier,
        shopDomain,
      },
    });

    const inventoryResult = await maybeAdjustInventory({
      ctx,
      alegraItemId,
      desired: desiredInventory,
      warehouseId: config.warehouseId,
      includeInventory: config.includeInventory,
      observations: `Sync Shopify ${identifier}`,
      alegraItem,
    });

    return {
      ok: true,
      action,
      alegraItemId,
      variantId,
      identifier,
      sku,
      price,
      inventory: inventoryResult,
    };
  });
}

export async function syncShopifyProductToAlegraFromWebhook(payload: unknown) {
  const data = (payload || {}) as Record<string, unknown>;
  const shopDomain = typeof data.__shopDomain === "string" ? data.__shopDomain.trim() : "";
  if (!shopDomain) {
    return { handled: false, reason: "missing_shop_domain" as const };
  }
  const store = await getStoreConfigForDomain(shopDomain).catch(() => null);
  const config = store ? resolveConfigFromStore(store) : DEFAULT_CONFIG;
  if (!config.enabled) {
    return { handled: false, reason: "disabled" as const };
  }

  const ctx = await buildSyncContext(shopDomain);
  const productId = data.id ? String(data.id) : "";
  const title = data.title ? String(data.title) : "Producto Shopify";
  const status = data.status ? String(data.status) : null;
  const variants = Array.isArray(data.variants) ? (data.variants as Record<string, unknown>[]) : [];
  const results = [];
  for (const v of variants) {
    const variantId = v?.id ? String(v.id) : "";
    const sku = v?.sku ? String(v.sku) : null;
    const barcode = v?.barcode ? String(v.barcode) : null;
    const price = v?.price ? String(v.price) : "0";
    const inventoryQuantity = coerceDecimal(v?.inventory_quantity);
    const node: ShopifyVariantNode = {
      id: variantId,
      title: v?.title ? String(v.title) : "Variante",
      sku,
      barcode,
      price,
      inventoryQuantity: inventoryQuantity ?? null,
      inventoryItem: v?.inventory_item_id ? { id: String(v.inventory_item_id) } : null,
    };
    results.push(
      await syncShopifyVariantToAlegra({
        ctx,
        shopDomain,
        product: { id: productId, title, status },
        variant: node,
        config,
      })
    );
  }
  return { handled: true, shopDomain, productId, results };
}

export async function syncShopifyInventoryLevelToAlegra(params: {
  shopDomain: string;
  inventoryItemId: string;
  available: number;
}) {
  const shopDomain = String(params.shopDomain || "").trim();
  const inventoryItemId = String(params.inventoryItemId || "").trim();
  if (!shopDomain) {
    return { handled: false, reason: "missing_shop_domain" as const };
  }
  if (!inventoryItemId) {
    return { handled: false, reason: "missing_inventory_item_id" as const };
  }

  const store = await getStoreConfigForDomain(shopDomain).catch(() => null);
  const config = store ? resolveConfigFromStore(store) : DEFAULT_CONFIG;
  if (!config.enabled) {
    return { handled: false, reason: "disabled" as const };
  }
  if (!config.includeInventory) {
    return { handled: false, reason: "inventory_disabled" as const };
  }

  const mapping = await getMappingByShopifyInventoryItemId("item", inventoryItemId);
  if (!mapping?.alegraId) {
    return { handled: false, reason: "missing_mapping" as const };
  }

  const ctx = await buildSyncContext(shopDomain);
  const inventory = await maybeAdjustInventory({
    ctx,
    alegraItemId: mapping.alegraId,
    desired: params.available,
    warehouseId: config.warehouseId,
    includeInventory: config.includeInventory,
    observations: `Sync Shopify inventory ${inventoryItemId}`,
  });

  return {
    handled: true,
    shopDomain,
    inventoryItemId,
    alegraItemId: mapping.alegraId,
    inventory,
  };
}

export async function syncShopifyProductsToAlegraBulk(params: {
  shopDomain: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  config?: Partial<ProductSyncConfig>;
  isCanceled?: () => boolean | Promise<boolean>;
  onEvent?: (payload: Record<string, unknown>) => void;
  resume?: boolean;
}) {
  const shopDomain = String(params.shopDomain || "").trim();
  if (!shopDomain) throw new Error("shopDomain requerido.");
  const ctx = await buildSyncContext(shopDomain);

  const onEvent = typeof params.onEvent === "function" ? params.onEvent : () => undefined;
  const isCanceled = typeof params.isCanceled === "function" ? params.isCanceled : () => false;
  const mergedConfig: ProductSyncConfig = {
    ...DEFAULT_CONFIG,
    ...(params.config || {}),
    enabled: true,
    matchPriority: params.config?.matchPriority || DEFAULT_CONFIG.matchPriority,
  };

  const queryParts: string[] = [];
  const dateStart = String(params.dateStart || "").trim();
  const dateEnd = String(params.dateEnd || "").trim();
  if (dateStart) queryParts.push(`updated_at:>='${dateStart}'`);
  if (dateEnd) queryParts.push(`updated_at:<='${dateEnd}'`);
  const query = queryParts.join(" AND ");

  const limit = Number.isFinite(Number(params.limit)) ? Number(params.limit) : 0;
  const safeLimit = limit > 0 ? Math.min(Math.max(1, limit), 5000) : undefined;

  const products = await ctx.shopify.listAllProductsByQuery(query, safeLimit);
  const totalProducts = products.length;
  const totalVariants = products.reduce((acc, product) => acc + (product?.variants?.edges?.length || 0), 0);
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const checkpointEntity = `products_to_alegra:${shopDomain}`;
  let resumeFromIndex = 0;
  if (params.resume !== false) {
    try {
      const checkpoint = await getSyncCheckpoint(checkpointEntity);
      if (checkpoint && checkpoint.total === totalProducts && checkpoint.lastStart > 0) {
        resumeFromIndex = Math.min(checkpoint.lastStart, totalProducts);
      } else if (checkpoint) {
        await clearSyncCheckpoint(checkpointEntity);
      }
    } catch {
      // ignore checkpoint read errors
    }
  } else {
    try {
      await clearSyncCheckpoint(checkpointEntity);
    } catch {
      // ignore
    }
  }

  onEvent({ type: "start", totalProducts, totalVariants, resumeFromIndex });
  for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
    const product = products[productIndex];
    if (productIndex < resumeFromIndex) {
      const variantsCount = Array.isArray(product?.variants?.edges) ? product.variants.edges.length : 0;
      processed += variantsCount;
      skipped += variantsCount;
      continue;
    }
    if (await isCanceled()) {
      try {
        await saveSyncCheckpoint({ entity: checkpointEntity, lastStart: productIndex, total: totalProducts });
      } catch {
        // ignore checkpoint save errors
      }
      onEvent({ type: "canceled", processed, created, updated, skipped, failed });
      return { ok: false, canceled: true, processed, created, updated, skipped, failed, totalProducts, totalVariants };
    }
    const variants = Array.isArray(product?.variants?.edges) ? product.variants.edges : [];
    for (const edge of variants) {
      if (await isCanceled()) {
        try {
          await saveSyncCheckpoint({ entity: checkpointEntity, lastStart: productIndex, total: totalProducts });
        } catch {
          // ignore checkpoint save errors
        }
        onEvent({ type: "canceled", processed, created, updated, skipped, failed });
        return {
          ok: false,
          canceled: true,
          processed,
          created,
          updated,
          skipped,
          failed,
          totalProducts,
          totalVariants,
        };
      }
      const variant = edge?.node;
      if (!variant) continue;
      try {
        const result = await syncShopifyVariantToAlegra({
          ctx,
          shopDomain,
          product: { id: product.id, title: product.title, status: product.status },
          variant,
          config: mergedConfig,
        });
        processed += 1;
        if (result.action === "created") created += 1;
        else if (result.action === "updated") updated += 1;
        else skipped += 1;
        onEvent({ type: "variant", ok: true, processed, totalVariants, result });
      } catch (error) {
        processed += 1;
        failed += 1;
        const message = error instanceof Error ? error.message : String(error || "error");
        onEvent({ type: "variant", ok: false, processed, totalVariants, error: message });
      }
      if (processed % 10 === 0 || processed === totalVariants) {
        onEvent({ type: "progress", processed, totalVariants, created, updated, skipped, failed });
      }
    }
    if ((productIndex + 1) % 25 === 0) {
      try {
        await saveSyncCheckpoint({
          entity: checkpointEntity,
          lastStart: productIndex + 1,
          total: totalProducts,
        });
      } catch {
        // ignore checkpoint save errors
      }
    }
  }
  try {
    await clearSyncCheckpoint(checkpointEntity);
  } catch {
    // ignore checkpoint clear errors
  }
  onEvent({ type: "done", processed, totalVariants, created, updated, skipped, failed });
  return { ok: true, processed, totalProducts, totalVariants, created, updated, skipped, failed };
}
