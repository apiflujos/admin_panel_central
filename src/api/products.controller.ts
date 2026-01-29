import type { Request, Response } from "express";
import net from "net";
import { getAlegraCredential, getShopifyCredential } from "../services/settings.service";
import { ShopifyClient } from "../connectors/shopify";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { syncInventoryAdjustments } from "../services/inventory-adjustments.service";
import { mapOrderToPayload } from "../services/operations.service";
import { getMappingByShopifyId } from "../services/mapping.service";
import { syncShopifyOrderToAlegra } from "../services/shopify-to-alegra.service";
import type { ShopifyOrder } from "../connectors/shopify";
import { createSyncLog } from "../services/logs.service";
import { clearSyncCheckpoint, getSyncCheckpoint, saveSyncCheckpoint } from "../services/sync-checkpoints.service";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../db";
import {
  countAlegraItemsCache,
  listAlegraItemsCache,
  upsertAlegraItemsCache,
} from "../services/alegra-items-cache.service";

type AlegraPrice = {
  name?: string;
  type?: string;
  price?: number | string;
};

type AlegraVariantAttribute = {
  label?: string;
  value?: string;
};

type AlegraVariant = {
  id?: string | number;
  barcode?: string;
  reference?: string;
  price?: AlegraPrice[];
  inventory?: {
    quantity?: number;
    availableQuantity?: number;
    warehouses?: Array<{ id?: string | number; availableQuantity?: number }>;
  };
  variantAttributes?: AlegraVariantAttribute[];
};

type AlegraItem = {
  id?: string | number;
  name?: string;
  description?: string;
  barcode?: string;
  reference?: string;
  code?: string | number;
  status?: string;
  customFields?: Array<{ name?: string; label?: string; value?: string }>;
  price?: AlegraPrice[];
  inventory?: {
    quantity?: number;
    availableQuantity?: number;
    warehouses?: Array<{ id?: string | number; availableQuantity?: number }>;
  };
  images?: Array<{ url?: string } | string>;
  itemVariants?: AlegraVariant[];
  variantAttributes?: AlegraVariantAttribute[];
  variantParent_id?: string | number;
  idItemParent?: string | number;
  type?: string;
  category?: { name?: string };
};

type ShopifyConfig = {
  baseAdmin: string;
  accessToken: string;
  apiVersion: string;
  vendorDefault: string;
  locationId: string;
};

const DEFAULT_SHOPIFY_VERSION = "2024-01";

async function getAlegraConfig() {
  const alegra = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  return { baseUrl, auth };
}

async function fetchAlegra(path: string, query?: URLSearchParams) {
  const { baseUrl, auth } = await getAlegraConfig();
  const url = query ? `${baseUrl}${path}?${query.toString()}` : `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  return response;
}

let activeProductsSync: { id: string; canceled: boolean; startedAt: number } | null = null;

const createSyncId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isSyncCanceled = (syncId: string) =>
  Boolean(activeProductsSync?.id === syncId && activeProductsSync.canceled);

async function fetchAlegraWithRetry(
  path: string,
  query: URLSearchParams | undefined,
  options: { maxRetries?: number; backoffBaseMs?: number; onRetry?: (waitMs: number) => void } = {}
) {
  const maxRetries = options.maxRetries ?? 5;
  const backoffBaseMs = options.backoffBaseMs ?? 2000;
  let attempt = 0;
  while (true) {
    const response = await fetchAlegra(path, query);
    if (response.status !== 429) {
      return response;
    }
    if (attempt >= maxRetries) {
      return response;
    }
    const waitMs = backoffBaseMs * Math.pow(2, attempt);
    if (options.onRetry) {
      options.onRetry(waitMs);
    }
    await sleep(waitMs);
    attempt += 1;
  }
}

const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

const extractCustomFieldValue = (item: AlegraItem, keys: string[]) => {
  if (!Array.isArray(item.customFields)) return "";
  const loweredKeys = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return loweredKeys.includes(name);
  });
  return String(match?.value || "").trim();
};

const extractIdentifier = (raw: string) => {
  const value = raw.trim();
  const segments = value.split(":");
  if (segments.length >= 2) {
    return segments.slice(1).join(":").trim();
  }
  return value;
};

const looksLikeIdentifier = (value: string) => {
  if (!value) return false;
  if (value.length < 3) return false;
  return !value.includes(" ");
};

const matchesIdentifier = (item: AlegraItem, identifier: string) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return false;
  const ref = normalizeIdentifier(String(item?.reference || ""));
  const barcode = normalizeIdentifier(String(item?.barcode || ""));
  const code = normalizeIdentifier(String(item?.code || ""));
  const customBarcode = normalizeIdentifier(
    extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"])
  );
  return ref === normalized || barcode === normalized || code === normalized || customBarcode === normalized;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dedupeVariants = (variants: AlegraVariant[]) => {
  const seen = new Set<string>();
  const unique: AlegraVariant[] = [];
  variants.forEach((variant) => {
    const key = String(variant.id || variant.reference || variant.barcode || "");
    const normalized = key.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(variant);
  });
  return unique;
};

const resolveItemDate = (item: AlegraItem) => {
  const raw =
    (item as { updated_at?: string; updatedAt?: string }).updated_at ||
    (item as { updated_at?: string; updatedAt?: string }).updatedAt ||
    (item as { created_at?: string; createdAt?: string }).created_at ||
    (item as { created_at?: string; createdAt?: string }).createdAt;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const mergeItemVariants = (parent: AlegraItem, incoming: AlegraVariant[]) => {
  const base = Array.isArray(parent.itemVariants) ? parent.itemVariants : [];
  const merged = dedupeVariants([...base, ...incoming]);
  return { ...parent, itemVariants: merged };
};

const collectItemIdentifiers = (item: AlegraItem) => {
  const identifiers: string[] = [];
  const push = (value?: string | number) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed) identifiers.push(trimmed);
  };
  push(item.reference);
  push(item.barcode);
  push(item.code);
  push(extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]));
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  variants.forEach((variant) => {
    push(variant.reference);
    push(variant.barcode);
  });
  return Array.from(new Set(identifiers));
};

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

async function getShopifyConfig(): Promise<ShopifyConfig> {
  const shopify = await getShopifyCredential();
  const rawDomain = shopify.shopDomain.trim();
  const cleanedDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const baseAdmin = `https://${cleanedDomain}/admin`;
  return {
    baseAdmin,
    accessToken: shopify.accessToken,
    apiVersion: shopify.apiVersion || DEFAULT_SHOPIFY_VERSION,
    vendorDefault: process.env.SHOPIFY_VENDOR || "",
    locationId: shopify.locationId || "",
  };
}

async function fetchShopify(path: string, options: RequestInit = {}, configOverride?: ShopifyConfig) {
  const config = configOverride || (await getShopifyConfig());
  const url = `${config.baseAdmin}/api/${config.apiVersion}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": config.accessToken,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

const pickPrice = (prices: AlegraPrice[] = []) => {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const general =
    prices.find((price) => price?.name?.toLowerCase?.().includes("general")) ||
    prices.find((price) => price?.type?.toLowerCase?.().includes("general")) ||
    prices[0];
  if (!general) return null;
  const parsed = typeof general.price === "string" ? Number(general.price) : general.price;
  return Number.isFinite(parsed) ? Number(parsed) : null;
};

const normalizeImageUrls = (images: Array<{ url?: string } | string> = []) =>
  images
    .map((image) => (typeof image === "string" ? image : image?.url))
    .filter((url): url is string => typeof url === "string" && url.length > 0);

const collectOptionLabels = (variants: AlegraVariant[] = []) => {
  const labels: string[] = [];
  variants.forEach((variant) => {
    if (!Array.isArray(variant?.variantAttributes)) return;
    variant.variantAttributes.forEach((attr) => {
      const label = attr?.label?.trim?.();
      if (label && !labels.includes(label)) {
        labels.push(label);
      }
    });
  });
  return labels;
};

const mapVariantOptions = (variantAttributes: AlegraVariantAttribute[] = [], labels: string[]) => {
  const options: Record<string, string> = {};
  labels.forEach((label, index) => {
    const match = variantAttributes.find((attr) => attr?.label === label);
    const value = match?.value ?? match?.label ?? "N/A";
    options[`option${index + 1}`] = value;
  });
  return options;
};

const normalizeWarehouseIds = (value?: string | null) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

const loadWarehouseIdsForSync = async () => {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureInventoryRulesColumns(pool);
  const result = await pool.query<{ warehouse_ids: string | null }>(
    `
    SELECT warehouse_ids
    FROM inventory_rules
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) return [];
  return normalizeWarehouseIds(result.rows[0].warehouse_ids);
};

const resolveInventoryQuantity = (
  inventory: AlegraItem["inventory"] | AlegraVariant["inventory"] | undefined,
  warehouseIds: string[]
) => {
  if (!inventory) return 0;
  if (warehouseIds.length && Array.isArray(inventory.warehouses)) {
    return inventory.warehouses
      .filter((warehouse) => warehouseIds.includes(String(warehouse.id)))
      .reduce((acc, warehouse) => acc + Number(warehouse.availableQuantity || 0), 0);
  }
  return (
    Number(inventory.quantity ?? inventory.availableQuantity ?? 0) || 0
  );
};

const parseQuantityValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveInventoryQuantityForFilter = (
  inventory: AlegraItem["inventory"] | AlegraVariant["inventory"] | undefined,
  warehouseIds: string[]
) => {
  if (!inventory) return null;
  const warehouses = Array.isArray(inventory.warehouses) ? inventory.warehouses : [];
  if (warehouseIds.length && warehouses.length) {
    const totals = warehouses.reduce(
      (acc, warehouse) => {
        if (!warehouseIds.includes(String(warehouse.id))) return acc;
        const qty = parseQuantityValue(warehouse.availableQuantity);
        if (qty !== null) {
          acc.sum += qty;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );
    return totals.count ? totals.sum : null;
  }
  const initialQuantity =
    inventory && "initialQuantity" in inventory ? (inventory as any).initialQuantity : undefined;
  const raw = inventory.quantity ?? inventory.availableQuantity ?? initialQuantity;
  if (raw === null || raw === undefined || raw === "") return null;
  const qty = parseQuantityValue(raw);
  return qty;
};

const resolveItemQuantityForFilter = (item: AlegraItem, warehouseIds: string[]) => {
  const base = resolveInventoryQuantityForFilter(item.inventory, warehouseIds);
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  if (!variants.length) return base;
  const totals = variants.reduce(
    (acc, variant) => {
      const qty = resolveInventoryQuantityForFilter(variant.inventory, warehouseIds);
      if (typeof qty === "number") {
        acc.sum += qty;
        acc.count += 1;
      }
      return acc;
    },
    { sum: 0, count: 0 }
  );
  if (!totals.count) return base;
  if (typeof base === "number") return Math.max(base, totals.sum);
  return totals.sum;
};

const matchesItemWarehouses = (item: AlegraItem, warehouseIds: string[]) => {
  if (!warehouseIds.length) return true;
  const warehouses = Array.isArray(item.inventory?.warehouses) ? item.inventory.warehouses : [];
  if (warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)))) return true;
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  return variants.some((variant) =>
    Array.isArray(variant.inventory?.warehouses)
      ? variant.inventory.warehouses.some((warehouse) =>
          warehouseIds.includes(String(warehouse.id))
        )
      : false
  );
};

const shouldSyncByWarehouse = (
  inventory: AlegraItem["inventory"] | AlegraVariant["inventory"] | undefined,
  warehouseIds: string[]
) => {
  if (!warehouseIds.length) return true;
  const warehouses = Array.isArray(inventory?.warehouses) ? inventory.warehouses : [];
  if (!warehouses.length) return true;
  return warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)));
};

const buildShopifyPayload = (
  alegraItem: AlegraItem,
  settings: { status?: string; includeImages?: boolean; vendor?: string },
  warehouseIds: string[],
  includeInventory: boolean
) => {
  const images = normalizeImageUrls(alegraItem.images || []);
  const itemVariants = Array.isArray(alegraItem.itemVariants) ? alegraItem.itemVariants : [];
  const optionLabels = collectOptionLabels(itemVariants);
  const categoryName = alegraItem?.category?.name;
  const tags = [`Alegra_ID_${alegraItem.id ?? ""}`];
  if (categoryName) {
    tags.push(categoryName);
  }

  const baseVariant = {
    sku:
      alegraItem.reference ||
      alegraItem.barcode ||
      extractCustomFieldValue(alegraItem, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
      "",
    price: pickPrice(alegraItem.price)?.toString() ?? "0",
    inventory_policy: "deny",
    inventory_management: "shopify",
    inventory_quantity: includeInventory
      ? resolveInventoryQuantity(alegraItem.inventory, warehouseIds)
      : 0,
  };

  const variants =
    itemVariants.length > 0
      ? itemVariants.map((variant) => ({
          sku:
            variant.reference ||
            variant.barcode ||
            alegraItem.reference ||
            alegraItem.barcode ||
            extractCustomFieldValue(alegraItem, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
            "",
          price: pickPrice(variant.price)?.toString() ?? "0",
          inventory_policy: "deny",
          inventory_management: "shopify",
          inventory_quantity: includeInventory
            ? resolveInventoryQuantity(variant.inventory, warehouseIds)
            : 0,
          barcode: variant.id ? `ALT-${variant.id}` : undefined,
          ...mapVariantOptions(variant.variantAttributes || [], optionLabels),
        }))
      : [
          {
            ...baseVariant,
            barcode: alegraItem.id ? `ALT-${alegraItem.id}` : undefined,
          },
        ];

  return {
    product: {
      title: alegraItem.name || "Producto Alegra",
      body_html: alegraItem.description
        ? `<strong>Descripcion tecnica:</strong> ${alegraItem.description}`
        : undefined,
      vendor: settings.vendor || (process.env.SHOPIFY_VENDOR || "") || "Alegra",
      product_type: categoryName || undefined,
      status: settings.status || "draft",
      published_scope: "web",
      tags: tags.join(", "),
      images: settings.includeImages ? images.map((src) => ({ src })) : [],
      options: optionLabels.map((label) => ({ name: label })),
      variants,
    },
  };
};

export async function listAlegraItemsHandler(req: Request, res: Response) {
  try {
    const inStockOnly =
      String(req.query.inStockOnly || "").toLowerCase() === "1" ||
      String(req.query.inStockOnly || "").toLowerCase() === "true";
    const warehouseFilterIds = String(req.query.warehouseIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const rawQueryValue = typeof req.query.query === "string" ? req.query.query : "";
    const identifierQuery = extractIdentifier(rawQueryValue);
    const source = String(req.query.source || "cache").toLowerCase();
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    query.delete("inStockOnly");
    query.delete("warehouseIds");
    if (!query.has("mode")) query.set("mode", "advanced");
    if (!query.has("fields")) {
      query.set(
        "fields",
        "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
    }
    if (!query.has("metadata")) query.set("metadata", "true");
    const scanLimit = Number(query.get("limit") || "30");
    const maxPages = 6;
    let page = 0;
    let scanStart = Number(query.get("start") || "0");
    let payload: Record<string, unknown> | null = null;
    let items: AlegraItem[] = [];
    let total: number | null = null;
    const shouldFilter = inStockOnly || warehouseFilterIds.length > 0;
    const cacheOnly = source === "cache";
    const preferCache = source !== "alegra";

    if (preferCache) {
      const cachedTotal = await countAlegraItemsCache();
      if (cachedTotal > 0 || cacheOnly) {
        const maxCachePages = 6;
        let cachedStart = Number(query.get("start") || "0");
        let cachedPage = 0;
        let cachedItems: AlegraItem[] = [];
        let cachedTotalResult = cachedTotal;
        while (cachedPage === 0 || (cachedItems.length < scanLimit && cachedPage < maxCachePages)) {
          const cached = await listAlegraItemsCache({
            query: rawQueryValue,
            start: cachedStart,
            limit: scanLimit,
          });
          if (cachedPage === 0) {
            cachedTotalResult = cached.total;
          }
          const cachedBatch = cached.items as unknown as AlegraItem[];
          let filtered = cachedBatch;
          if (shouldFilter) {
            filtered = cachedBatch.filter((item) => {
              const matchesWarehouse =
                warehouseFilterIds.length === 0 ||
                matchesItemWarehouses(item, warehouseFilterIds);
              if (!matchesWarehouse) return false;
              if (!inStockOnly) return true;
              const qty = resolveItemQuantityForFilter(item, warehouseFilterIds);
              return qty === null ? true : qty > 0;
            });
          }
          cachedItems = cachedItems.concat(filtered);
          if (cachedBatch.length < scanLimit) {
            break;
          }
          if (!shouldFilter) {
            break;
          }
          cachedStart += scanLimit;
          cachedPage += 1;
        }
        res.status(200).json({
          metadata: { total: cachedTotalResult, filtered: shouldFilter, source: "cache" },
          data: cachedItems.slice(0, scanLimit),
        });
        return;
      }
    }

    const needsInventoryForFilter = (item: AlegraItem) => {
      if (inStockOnly) return true;
      const inv = item?.inventory;
      if (!inv) return true;
      const hasWarehouses = Array.isArray(inv.warehouses) && inv.warehouses.length > 0;
      if (hasWarehouses) return false;
      const qty = typeof inv.quantity === "number" ? inv.quantity : null;
      const available = typeof inv.availableQuantity === "number" ? inv.availableQuantity : null;
      if (qty === null && available === null) return true;
      return qty === 0 && available === 0;
    };

    const hydrateItemsForFilter = async (input: AlegraItem[]) => {
      if (!shouldFilter || input.length === 0) return input;
      const detailQuery = new URLSearchParams();
      detailQuery.set(
        "fields",
        "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
      detailQuery.set("mode", "advanced");
      return Promise.all(
        input.map(async (item) => {
          if (!item?.id) return item;
          if (!needsInventoryForFilter(item)) return item;
          const detailResponse = await fetchAlegraWithRetry(`/items/${item.id}`, detailQuery);
          if (!detailResponse.ok) return item;
          return (await detailResponse.json()) as AlegraItem;
        })
      );
    };

    const filterItems = (input: AlegraItem[]) => {
      if (!shouldFilter) return input;
      return input.filter((item) => {
        const matchesWarehouse =
          warehouseFilterIds.length === 0 || matchesItemWarehouses(item, warehouseFilterIds);
        if (!matchesWarehouse) return false;
        if (!inStockOnly) return true;
        const qty = resolveItemQuantityForFilter(item, warehouseFilterIds);
        return qty === null ? true : qty > 0;
      });
    };

    while (page === 0 || (items.length < scanLimit && page < maxPages)) {
      query.set("start", String(scanStart));
      query.set("limit", String(scanLimit));
      const response = await fetchAlegra("/items", query);
      payload = (await response.json()) as Record<string, unknown>;
      const rawBatch: AlegraItem[] = Array.isArray((payload as any)?.items)
        ? ((payload as any).items as AlegraItem[])
        : Array.isArray((payload as any)?.data)
          ? ((payload as any).data as AlegraItem[])
          : [];
      const batch = await hydrateItemsForFilter(rawBatch);
      const filtered = filterItems(batch);
      items = items.concat(filtered);
      if (total === null) {
        const metaTotal =
          (payload as any)?.metadata?.total ?? (payload as any)?.metadata?.totalItems;
        total = typeof metaTotal === "number" ? metaTotal : null;
      }
      if (batch.length < scanLimit) {
        break;
      }
      if (!shouldFilter) {
        break;
      }
      scanStart += scanLimit;
      page += 1;
    }

    if (!payload) {
      payload = { items: [] };
    }
    items = items.slice(0, scanLimit);
    const needsInventoryHydration = items.some((item) => {
      const inv = item?.inventory;
      if (!inv) return true;
      const hasWarehouses = Array.isArray(inv.warehouses) && inv.warehouses.length > 0;
      const hasQty =
        typeof inv.availableQuantity === "number" ||
        typeof inv.quantity === "number";
      return !hasWarehouses && !hasQty;
    });
    let resolvedItems = items;
    if (needsInventoryHydration && items.length) {
      const detailQuery = new URLSearchParams();
      detailQuery.set(
        "fields",
        "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
      detailQuery.set("mode", "advanced");
      resolvedItems = await Promise.all(
        items.map(async (item) => {
          if (!item?.id) return item;
          const inv = item.inventory;
          const hasWarehouses =
            Array.isArray(inv?.warehouses) && inv?.warehouses.length > 0;
          const hasQty =
            typeof inv?.availableQuantity === "number" ||
            typeof inv?.quantity === "number";
          if (hasWarehouses || hasQty) return item;
          const detailResponse = await fetchAlegraWithRetry(`/items/${item.id}`, detailQuery);
          if (!detailResponse.ok) return item;
          return (await detailResponse.json()) as AlegraItem;
        })
      );
    }
    if (resolvedItems.length) {
      await upsertAlegraItemsCache(resolvedItems);
    }
    if (rawQueryValue && looksLikeIdentifier(identifierQuery)) {
      const matched = resolvedItems.filter((item: AlegraItem) =>
        matchesIdentifier(item, identifierQuery)
      );
      if (items.length === 0 || matched.length === 0) {
        const scanItems = await scanAlegraItemsByIdentifier(identifierQuery);
        const detailQuery = new URLSearchParams();
        detailQuery.set(
          "fields",
          "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,idItemParent"
        );
        detailQuery.set("mode", "advanced");
        const hydrated = await Promise.all(
          scanItems.map(async (item) => {
            if (!item?.id) return null;
            const detailResponse = await fetchAlegra(`/items/${item.id}`, detailQuery);
            if (!detailResponse.ok) return null;
            return (await detailResponse.json()) as AlegraItem;
          })
        );
        const fullItems = hydrated.filter(Boolean) as AlegraItem[];
        const total = fullItems.length;
        const start = Number(query.get("start") || "0");
        const limit = Number(query.get("limit") || total);
        const sliced = fullItems.slice(start, start + limit);
        res.json({ metadata: { total }, data: sliced });
        return;
      }
    }
    if (Array.isArray((payload as any)?.items)) {
      (payload as any).items = resolvedItems;
    } else if (Array.isArray((payload as any)?.data)) {
      (payload as any).data = resolvedItems;
    } else {
      (payload as any).items = resolvedItems;
    }
    if (!((payload as any).metadata && typeof (payload as any).metadata === "object")) {
      (payload as any).metadata = {};
    }
    if (typeof total === "number") {
      (payload as any).metadata.total = total;
    }
    (payload as any).metadata.filtered = inStockOnly || warehouseFilterIds.length > 0;
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Alegra proxy error" });
    await safeCreateLog({
      entity: "alegra_items_list",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Alegra proxy error",
      request: {
        query: req.query,
      },
    });
  }
}

async function scanAlegraItemsByIdentifier(
  identifier: string,
  options: { onRateLimit?: (waitMs: number) => void } = {}
) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return [];
  let scanStart = 0;
  const scanLimit = 100;
  let scanTotal: number | null = null;
  let pages = 0;
  const maxPages = 200;
  const matches: AlegraItem[] = [];
  while (pages < maxPages) {
    const scanQuery = new URLSearchParams();
    scanQuery.set("start", String(scanStart));
    scanQuery.set("limit", String(scanLimit));
    scanQuery.set("metadata", "true");
    scanQuery.set("fields", "id,reference,barcode,code,name,customFields");
    scanQuery.set("mode", "advanced");
    const response = await fetchAlegraWithRetry("/items", scanQuery, {
      onRetry: options.onRateLimit,
    });
    if (!response.ok) break;
    const payload = (await response.json()) as {
      items?: AlegraItem[];
      data?: AlegraItem[];
      metadata?: { total?: number; totalItems?: number };
    };
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    scanTotal = payload?.metadata?.total ?? payload?.metadata?.totalItems ?? scanTotal;
    for (const item of items) {
      if (matchesIdentifier(item, normalized)) {
        matches.push(item);
      }
    }
    if (matches.length) break;
    scanStart += scanLimit;
    pages += 1;
    if (items.length === 0 || (scanTotal !== null && scanStart >= scanTotal)) break;
    await sleep(500);
  }
  return matches;
}

export async function listInventoryAdjustmentsHandler(req: Request, res: Response) {
  try {
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    if (!query.has("metadata")) query.set("metadata", "true");
    const rawLimit = Number(query.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 30) : 30;
    query.set("limit", String(limit));
    const response = await fetchAlegra("/inventory-adjustments", query);
    const payload = await response.json();
    res.status(response.status).json(payload);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Alegra proxy error" });
    await safeCreateLog({
      entity: "inventory_adjustments_list",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Alegra proxy error",
      request: { query: req.query },
    });
  }
}

export async function listItemWarehouseSummaryHandler(req: Request, res: Response) {
  const itemId = req.params.itemId;
  if (!itemId) {
    res.status(400).json({ error: "itemId requerido" });
    return;
  }
  try {
    const query = new URLSearchParams();
    query.set("mode", "advanced");
    query.set("fields", "inventory");
    const response = await fetchAlegra(`/items/${itemId}`, query);
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text || "Alegra item error" });
      return;
    }
    const payload = (await response.json()) as {
      id?: string | number;
      inventory?: { availableQuantity?: number | string; warehouses?: Array<{ id?: string | number; name?: string; availableQuantity?: number | string }> };
    };
    const warehouses = Array.isArray(payload?.inventory?.warehouses) ? payload.inventory.warehouses : [];
    res.json({
      id: payload.id ? String(payload.id) : String(itemId),
      availableQuantity: payload.inventory?.availableQuantity ?? null,
      warehouses: warehouses.map((warehouse) => ({
        id: warehouse.id ? String(warehouse.id) : "",
        name: warehouse.name || "",
        availableQuantity: warehouse.availableQuantity ?? null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Warehouse summary error" });
    await safeCreateLog({
      entity: "warehouse_summary",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Warehouse summary error",
      request: { itemId: req.params.itemId },
    });
  }
}

export async function syncInventoryAdjustmentsHandler(req: Request, res: Response) {
  try {
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    const result = await syncInventoryAdjustments(query);
    res.json({ ok: true, ...result });
    await safeCreateLog({
      entity: "inventory_adjustments_sync",
      direction: "alegra->shopify",
      status: "success",
      message: "Inventory adjustments sync ok",
      request: { query: Object.fromEntries(query.entries()) },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Sync adjustments error" });
    await safeCreateLog({
      entity: "inventory_adjustments_sync",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Sync adjustments error",
      request: { query: req.query },
    });
  }
}

export async function publishShopifyHandler(req: Request, res: Response) {
  const { alegraId, settings = {}, alegraItem } = req.body || {};
  try {
    const shopifyConfig = await getShopifyConfig();
    let item: AlegraItem | undefined = alegraItem;
    if (!item && alegraId) {
      const query = new URLSearchParams();
      query.set("mode", "advanced");
      query.set("fields", "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId");
      const response = await fetchAlegra(`/items/${alegraId}`, query);
      if (!response.ok) {
        throw new Error(`Alegra HTTP ${response.status}`);
      }
      item = (await response.json()) as AlegraItem;
    }
    if (!item) {
      res.status(400).json({ error: "alegraId o alegraItem requerido" });
      return;
    }
    const warehouseIds = await loadWarehouseIdsForSync();
    if (!shouldSyncByWarehouse(item.inventory, warehouseIds)) {
      res.status(400).json({ error: "Producto fuera de las bodegas seleccionadas." });
      return;
    }
    const payload = buildShopifyPayload(item, settings, warehouseIds, true);
    const published = await fetchShopify("/products.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, shopifyConfig);
    res.json({ ok: true, shopify: published });
    await safeCreateLog({
      entity: "shopify_publish",
      direction: "alegra->shopify",
      status: "success",
      message: "Producto publicado",
      request: { alegraId, settings },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Shopify publish error" });
    await safeCreateLog({
      entity: "shopify_publish",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Shopify publish error",
      request: { alegraId, settings },
    });
  }
}

export async function lookupShopifyHandler(req: Request, res: Response) {
  const skus = Array.isArray(req.body?.skus)
    ? req.body.skus.map((sku: string) => String(sku).trim()).filter(Boolean)
    : [];
  if (skus.length === 0) {
    res.json({ results: {} });
    return;
  }
  const results: Record<string, { published: boolean; status: string; productId?: string; title?: string }> = {};
  const seenProducts = new Map<string, { id?: string; status?: string; title?: string }>();

  try {
    const shopifyCredential = await getShopifyCredential();
    const client = new ShopifyClient({
      shopDomain: shopifyCredential.shopDomain,
      accessToken: shopifyCredential.accessToken,
      apiVersion: shopifyCredential.apiVersion || DEFAULT_SHOPIFY_VERSION,
    });
    for (const sku of skus) {
      if (results[sku]) continue;
      const lookup = await client.findVariantByIdentifier(sku);
      const variantNode = lookup.productVariants?.edges?.[0]?.node;
      if (!variantNode?.id) {
        results[sku] = { published: false, status: "not_published" };
        continue;
      }
      const productId = variantNode.product?.id;
      if (!productId) {
        results[sku] = { published: false, status: "not_published" };
        continue;
      }
      let product = seenProducts.get(productId);
      if (!product) {
        const productPayload = await client.getProductById(productId);
        product = productPayload?.product;
        seenProducts.set(productId, product);
      }
      results[sku] = {
        published: Boolean(product?.id),
        status: product?.status || "active",
        productId: product?.id ? String(product.id) : undefined,
        title: product?.title,
      };
    }
    res.json({ results });
    await safeCreateLog({
      entity: "shopify_lookup",
      direction: "shopify->alegra",
      status: "success",
      message: "Lookup batch ok",
      request: { skus },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Shopify lookup error" });
    await safeCreateLog({
      entity: "shopify_lookup",
      direction: "shopify->alegra",
      status: "fail",
      message: error instanceof Error ? error.message : "Shopify lookup error",
      request: { skus },
    });
  }
}

export async function syncProductsHandler(req: Request, res: Response) {
  const { mode = "full", batchSize = 5, filters = {}, settings = {} } = req.body || {};
    const maxItems = Number.isFinite(Number(filters.limit)) ? Number(filters.limit) : null;
    const onlyActive = filters.onlyActive !== false;
    const includeInventory = filters.includeInventory !== false;
  const safeBatchSize = Math.max(1, Math.min(Number(batchSize) || 5, 10));
  const hasDateFilter = Boolean(filters.dateStart || filters.dateEnd);
  const rawQuery = filters.query ? extractIdentifier(String(filters.query)) : "";
  const hasIdentifierQuery = looksLikeIdentifier(rawQuery);
  const effectiveMode =
    mode === "filtered" && !hasDateFilter && !filters.query ? "full" : mode;
  const publishOnSync =
    settings.publishOnSync !== false &&
    settings.publishOnSync !== "false" &&
    settings.publishOnSync !== 0 &&
    settings.publishOnSync !== "0";
  const onlyPublishedInShopify =
    settings.onlyPublishedInShopify !== false &&
    settings.onlyPublishedInShopify !== "false" &&
    settings.onlyPublishedInShopify !== 0 &&
    settings.onlyPublishedInShopify !== "0";
  const bypassPublishedFilter = Boolean(filters.query);
  const batchLimit = 30;
  const batchDelayMs = 500;
  const usesCheckpoint =
    effectiveMode === "full" &&
    !filters.query &&
    !filters.dateStart &&
    !filters.dateEnd &&
    !maxItems;
  let start = 0;
  let processed = 0;
  let scanned = 0;
  let published = 0;
  let skipped = 0;
  let skippedUnpublished = 0;
  let failed = 0;
  let rateLimitRetries = 0;
  let total: number | null = null;
  let parentCount = 0;
  let variantCount = 0;
  const events: string[] = [];
  const stream =
    req.query.stream === "1" ||
    req.query.stream === "true" ||
    req.body?.stream === true;
  let streamOpen = stream;
  const sendStream = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };
  const startedAt = Date.now();
  const syncId = createSyncId();
  const processedParents = new Set<string>();
  const pendingVariants = new Map<string, AlegraVariant[]>();

  try {
    activeProductsSync = { id: syncId, canceled: false, startedAt };
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }
    if (usesCheckpoint) {
      const checkpoint = await getSyncCheckpoint("products");
      if (checkpoint?.lastStart) {
        start = checkpoint.lastStart;
        total = checkpoint.total ?? total;
      }
    }
    const shopifyCredential = publishOnSync ? await getShopifyCredential() : null;
    const shopifyConfig = publishOnSync ? await getShopifyConfig() : null;
    const warehouseIds = await loadWarehouseIdsForSync();
    const shopifyClient =
      publishOnSync && shopifyCredential
        ? new ShopifyClient({
            shopDomain: shopifyCredential.shopDomain,
            accessToken: shopifyCredential.accessToken,
            apiVersion: shopifyCredential.apiVersion || DEFAULT_SHOPIFY_VERSION,
          })
        : null;
    const identifierCache = new Map<
      string,
      { exists: boolean; productId?: string; status?: string | null }
    >();
    const resolveExistingVariant = async (identifier: string) => {
      const normalized = normalizeIdentifier(identifier);
      if (!normalized || !shopifyClient) return { exists: false };
      if (identifierCache.has(normalized)) {
        return identifierCache.get(normalized) || { exists: false };
      }
      const lookup = await shopifyClient.findVariantByIdentifier(identifier);
      const node = lookup.productVariants?.edges?.[0]?.node;
      const exists = Boolean(node?.id);
      const result = {
        exists,
        productId: node?.product?.id ? String(node.product.id) : undefined,
        status: node?.product?.status ?? null,
      };
      identifierCache.set(normalized, result);
      return result;
    };
    const resolveShopifyStatus = async (item: AlegraItem) => {
      if (!shopifyClient) return { exists: false, published: false };
      const identifiers = collectItemIdentifiers(item);
      for (const identifier of identifiers) {
        const result = await resolveExistingVariant(identifier);
        if (result.exists) {
          const status = String(result.status || "").toLowerCase();
          return { exists: true, published: status === "active" };
        }
      }
      return { exists: false, published: false };
    };
    const toVariant = (item: AlegraItem): AlegraVariant => ({
      id: item.id,
      barcode: item.barcode,
      reference: item.reference,
      price: item.price,
      inventory: item.inventory,
      variantAttributes: item.variantAttributes,
    });
    const mergePendingVariants = (item: AlegraItem) => {
      const parentId = item.id ? String(item.id) : "";
      if (!parentId || !pendingVariants.has(parentId)) return item;
      const variants = pendingVariants.get(parentId) || [];
      pendingVariants.delete(parentId);
      return mergeItemVariants(item, variants);
    };
    const logEvent = (message: string) => {
      events.push(message);
      if (events.length > 200) {
        events.shift();
      }
    };
    const onRateLimit = (waitMs: number) => {
      rateLimitRetries += 1;
      logEvent(`429 Alegra, reintento en ${Math.round(waitMs / 1000)}s...`);
      sendStream({ type: "rate_limit", waitMs, retries: rateLimitRetries });
    };
    const processQueue = async (
      queueItems: Array<{ item: AlegraItem; priority: number; parentId?: string }>
    ) => {
      if (!queueItems.length) return;
      const sorted = queueItems.sort((a, b) => a.priority - b.priority);
      let cursor = 0;
      const worker = async () => {
        while (cursor < sorted.length) {
          if (isSyncCanceled(syncId)) {
            return;
          }
          const current = sorted[cursor];
          cursor += 1;
          const parentId = current.parentId;
          if (!publishOnSync) {
            if (parentId) processedParents.add(parentId);
            continue;
          }
          try {
            if (!shouldSyncByWarehouse(current.item.inventory, warehouseIds)) {
              skipped += 1;
              if (parentId) processedParents.add(parentId);
              continue;
            }
            const status = await resolveShopifyStatus(current.item);
            if (onlyPublishedInShopify && !bypassPublishedFilter && !status.published) {
              skippedUnpublished += 1;
              if (parentId) processedParents.add(parentId);
              continue;
            }
            if (status.exists) {
              skipped += 1;
              if (parentId) processedParents.add(parentId);
              continue;
            }
            const payloadShopify = buildShopifyPayload(
              current.item,
              {
                status: settings.status || "draft",
                includeImages: settings.includeImages ?? true,
                vendor: settings.vendor || "",
              },
              warehouseIds,
              includeInventory
            );
            await fetchShopify(
              "/products.json",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadShopify),
              },
              shopifyConfig || undefined
            );
            published += 1;
            if (parentId) processedParents.add(parentId);
          } catch {
            failed += 1;
          }
        }
      };
      const runners = Array.from({ length: safeBatchSize }, () => worker());
      await Promise.all(runners);
    };
    let hasMore = true;
    let triedReferenceFallback = false;
    const searchAttempts: string[] = [];
    let searchMessage = "";

    const hydrateItems = async (items: AlegraItem[]) => {
      const ids = items.map((item) => item?.id).filter(Boolean);
      if (!ids.length) return items;
      const detailQuery = new URLSearchParams();
      detailQuery.set(
        "fields",
        "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code"
      );
      detailQuery.set("mode", "advanced");
      const detailResponses = await Promise.all(
        ids.map(async (id) => {
          const response = await fetchAlegraWithRetry(`/items/${id}`, detailQuery, {
            onRetry: onRateLimit,
          });
          if (!response.ok) return null;
          return (await response.json()) as AlegraItem;
        })
      );
      return detailResponses.filter(Boolean) as AlegraItem[];
    };

    const fetchItemsWithQuery = async (queryValue: string) => {
      const base = new URLSearchParams();
      base.set("metadata", "true");
      base.set("limit", String(batchLimit));
      const variants = [
        `reference:${queryValue}`,
        `barcode:${queryValue}`,
        `code:${queryValue}`,
        `name:${queryValue}`,
        queryValue,
      ];
      for (const variant of variants) {
        const attempt = new URLSearchParams(base);
        attempt.set("query", variant);
        searchAttempts.push(`query=${variant}`);
        const response = await fetchAlegraWithRetry("/items", attempt, {
          onRetry: onRateLimit,
        });
        if (!response.ok) continue;
        const payload = (await response.json()) as { items?: AlegraItem[]; data?: AlegraItem[] };
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        if (items.length) return hydrateItems(items);
      }
      const paramVariants: Array<[string, string]> = [
        ["reference", queryValue],
        ["name", queryValue],
        ["code", queryValue],
        ["barcode", queryValue],
      ];
      for (const [key, value] of paramVariants) {
        const attempt = new URLSearchParams(base);
        attempt.set(key, value);
        searchAttempts.push(`${key}=${value}`);
        const response = await fetchAlegraWithRetry("/items", attempt, {
          onRetry: onRateLimit,
        });
        if (!response.ok) continue;
        const payload = (await response.json()) as { items?: AlegraItem[]; data?: AlegraItem[] };
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        if (items.length) return hydrateItems(items);
      }
      return [];
    };

    const scanItemsByIdentifier = async (identifier: string) => {
      const matches = await scanAlegraItemsByIdentifier(identifier, { onRateLimit });
      if (matches.length) {
        searchMessage = `Encontrado con busqueda profunda: ${identifier}.`;
      }
      return hydrateItems(matches);
    };

    sendStream({ type: "start", startedAt, total, batchLimit, syncId, mode: effectiveMode });

    while (hasMore) {
      if (isSyncCanceled(syncId)) {
        logEvent("Sincronizacion cancelada por el usuario.");
        sendStream({ type: "canceled", syncId });
        if (!stream) {
          res.json({ ok: false, canceled: true, syncId });
        } else {
          streamOpen = false;
          res.end();
        }
        activeProductsSync = null;
        await safeCreateLog({
          entity: "products_sync",
          direction: "alegra->shopify",
          status: "fail",
          message: "Sync cancelado por el usuario",
          request: {
            mode: effectiveMode,
            filters,
            settings,
            batchSize: safeBatchSize,
            syncId,
          },
        });
        return;
      }
      const query = new URLSearchParams();
      query.set("start", String(start));
      query.set("limit", String(batchLimit));
      query.set("metadata", "true");
      query.set("mode", "advanced");
      query.set(
        "fields",
        "variantAttributes,itemVariants,inventory,variantParent_id,variantParentId,customFields,barcode,reference,code"
      );
      if (effectiveMode === "filtered") {
        if (filters.dateStart) query.set("updated_at_start", filters.dateStart);
        if (filters.dateEnd) query.set("updated_at_end", filters.dateEnd);
        const dateQueryParts = [];
        if (filters.dateStart) dateQueryParts.push(`created_at:>='${filters.dateStart}'`);
        if (filters.dateEnd) dateQueryParts.push(`created_at:<='${filters.dateEnd}'`);
        const dateQuery = dateQueryParts.join(" ");
        if (filters.query && dateQuery) {
          query.set("query", `${filters.query} ${dateQuery}`);
        } else if (filters.query) {
          query.set("query", filters.query);
        } else if (dateQuery) {
          query.set("query", dateQuery);
        }
      }
      if (effectiveMode === "full" && filters.query) {
        query.set("query", filters.query);
      }

      const response = await fetchAlegraWithRetry("/items", query, {
        onRetry: onRateLimit,
      });
      if (response.status === 429) {
        logEvent("Límite Alegra persistente, reintentando batch...");
        sendStream({ type: "batch_retry", start });
        await sleep(batchDelayMs * 4);
        continue;
      }
      if (!response.ok) {
        logEvent(`Error Alegra HTTP ${response.status}, saltando batch.`);
        sendStream({ type: "batch_error", start, status: response.status });
        start += batchLimit;
        if (total !== null && start >= total) {
          hasMore = false;
        }
        await sleep(batchDelayMs);
        continue;
      }
      const payload = (await response.json()) as { items?: AlegraItem[]; data?: AlegraItem[]; metadata?: { total?: number; totalItems?: number } };
      let items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
      if (onlyActive) {
        items = items.filter((item) => String(item?.status || "active").toLowerCase() !== "inactive");
      }
      total = payload?.metadata?.total ?? payload?.metadata?.totalItems ?? total;

      if (hasDateFilter) {
        const startDate = filters.dateStart ? new Date(filters.dateStart).getTime() : null;
        const endDate = filters.dateEnd ? new Date(filters.dateEnd).getTime() : null;
        items = items.filter((item: AlegraItem) => {
          const itemDate = resolveItemDate(item);
          if (!itemDate) return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate) {
            const endLimit = endDate + 24 * 60 * 60 * 1000 - 1;
            if (itemDate > endLimit) return false;
          }
          return true;
        });
      }

      const shouldScan = rawQuery && looksLikeIdentifier(rawQuery);
      if (shouldScan && items.length) {
        const matched = items.filter((item: AlegraItem) => matchesIdentifier(item, rawQuery));
        if (matched.length) {
          items = matched;
          total = matched.length;
        } else {
          items = [];
        }
      }

      if (!items.length && filters.query && !triedReferenceFallback && start === 0) {
        triedReferenceFallback = true;
        items = await fetchItemsWithQuery(String(filters.query));
        if (!items.length) {
          items = await scanItemsByIdentifier(String(filters.query));
          if (!items.length) {
            searchMessage = `No se encontraron productos para "${filters.query}".`;
          }
        }
      }
      items.forEach((item) => {
        if (item?.type === "variantParent") {
          parentCount += 1;
          return;
        }
        if (item.variantParent_id || item.idItemParent) {
          variantCount += 1;
          return;
        }
        parentCount += 1;
      });

      const queueItems: Array<{ item: AlegraItem; priority: number; parentId?: string }> = [];
      items.forEach((item) => {
        if (item.variantParent_id || item.idItemParent) {
          const parentId = String(item.variantParent_id || item.idItemParent || "");
          if (!parentId || processedParents.has(parentId)) return;
          const variant = toVariant(item);
          const existing = pendingVariants.get(parentId) || [];
          pendingVariants.set(parentId, [...existing, variant]);
          return;
        }
        const parentId = item.id ? String(item.id) : "";
        if (parentId && processedParents.has(parentId)) return;
        const mergedItem = mergePendingVariants(item);
        const priority = item?.type === "variantParent" ? 0 : 1;
        queueItems.push({ item: mergedItem, priority, parentId: parentId || undefined });
      });

      if (queueItems.length) {
        const batchNumber = Math.floor(start / batchLimit) + 1;
        const totalBatches = total ? Math.ceil(total / batchLimit) : null;
        const rangeStart = start + 1;
        const rangeEnd = start + items.length;
        logEvent(
          `Procesando batch ${batchNumber}/${totalBatches || "?"} (Items ${rangeStart}-${rangeEnd})...`
        );
        sendStream({
          type: "batch_start",
          batchNumber,
          totalBatches,
          rangeStart,
          rangeEnd,
          total,
          scanned,
        });
      }

      await processQueue(queueItems);
      scanned += items.length;
      processed += queueItems.length;
      if (usesCheckpoint) {
        await saveSyncCheckpoint({
          entity: "products",
          lastStart: start + batchLimit,
          total,
        });
      }
      if (queueItems.length) {
        logEvent("Batch OK");
      }
      if (items.length) {
        sendStream({
          type: "progress",
          processed,
          scanned,
          published,
          skipped,
          skippedUnpublished,
          failed,
          total,
          rateLimitRetries,
          syncId,
        });
      }
      if (maxItems && processed >= maxItems) {
        hasMore = false;
        break;
      }

      start += batchLimit;
      if (items.length === 0 || (total !== null && start >= total)) {
        hasMore = false;
      }
      if (hasMore) {
        await sleep(batchDelayMs);
      }
    }

    if (pendingVariants.size) {
      logEvent(`Variantes sin padre: ${pendingVariants.size}.`);
    }
    logEvent(
      `Sincronizacion completada: ${scanned} items revisados, ${processed} procesados, ${rateLimitRetries} reintentos por tasa, ${failed} errores.`
    );
    let inventoryAdjustmentsResult: unknown = null;
    try {
      inventoryAdjustmentsResult = await syncInventoryAdjustments(new URLSearchParams());
    } catch (error) {
      inventoryAdjustmentsResult = {
        error: error instanceof Error ? error.message : "Inventory adjustments sync failed",
      };
    }
    if (usesCheckpoint) {
      await clearSyncCheckpoint("products");
    }
    const responsePayload = {
      ok: true,
      scanned,
      processed,
      published,
      skipped,
      skippedUnpublished,
      failed,
      rateLimitRetries,
      total,
      parentCount,
      variantCount,
      publishOnSync,
      publishStatus: settings.status || "draft",
      onlyPublishedInShopify,
      syncId,
      message: searchMessage,
      attempts: searchAttempts.length ? searchAttempts : undefined,
      events: events.length ? events : undefined,
      inventoryAdjustments: inventoryAdjustmentsResult,
    };
    if (stream) {
      sendStream({ type: "complete", ...responsePayload });
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "products_sync",
        direction: "alegra->shopify",
        status: "success",
        message: "Sync productos ok",
        request: {
          mode: effectiveMode,
          filters,
          settings,
          batchSize: safeBatchSize,
          syncId,
        },
        response: responsePayload as Record<string, unknown>,
      });
      activeProductsSync = null;
      return;
    }
    res.json(responsePayload);
    await safeCreateLog({
      entity: "products_sync",
      direction: "alegra->shopify",
      status: "success",
      message: "Sync productos ok",
      request: {
        mode: effectiveMode,
        filters,
        settings,
        batchSize: safeBatchSize,
        syncId,
      },
      response: responsePayload as Record<string, unknown>,
    });
    activeProductsSync = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync error";
    if (stream) {
      sendStream({ type: "error", error: message });
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "products_sync",
        direction: "alegra->shopify",
        status: "fail",
        message,
        request: {
          mode: effectiveMode,
          filters,
          settings,
          batchSize: safeBatchSize,
          syncId,
        },
      });
      activeProductsSync = null;
      return;
    }
    res.status(500).json({ error: message });
    await safeCreateLog({
      entity: "products_sync",
      direction: "alegra->shopify",
      status: "fail",
      message,
      request: {
        mode: effectiveMode,
        filters,
        settings,
        batchSize: safeBatchSize,
        syncId,
      },
    });
    activeProductsSync = null;
  }
}

export async function syncOrdersHandler(req: Request, res: Response) {
  const { filters = {} } = req.body || {};
  const stream =
    req.query.stream === "1" ||
    req.query.stream === "true" ||
    req.body?.stream === true;
  let streamOpen = stream;
  const sendStream = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };
  const startedAt = Date.now();
  try {
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }
    const shopifyCredential = await getShopifyCredential();
    const client = new ShopifyClient({
      shopDomain: shopifyCredential.shopDomain,
      accessToken: shopifyCredential.accessToken,
      apiVersion: shopifyCredential.apiVersion || DEFAULT_SHOPIFY_VERSION,
    });
    let orders: ShopifyOrder[] = [];
    const limit = Number(filters.limit || 0);
    const orderNumber = String(filters.orderNumber || "").replace(/^#/, "").trim();
    if (orderNumber) {
      const query = `name:${orderNumber}`;
      orders = await client.listAllOrdersByQuery(query);
    } else if (filters.dateStart || filters.dateEnd) {
      const parts = [];
      if (filters.dateStart) parts.push(`created_at:>='${filters.dateStart}'`);
      if (filters.dateEnd) parts.push(`created_at:<='${filters.dateEnd}'`);
      const query = parts.join(" ");
      orders = await client.listAllOrdersByQuery(query, limit > 0 ? limit : undefined);
    } else {
      orders = await client.listAllOrdersByQuery("status:any", limit > 0 ? limit : undefined);
    }
    if (limit > 0) {
      orders = orders.slice(0, limit);
    }
    const total = orders.length;
    sendStream({ type: "start", startedAt, total });
    let processed = 0;
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const step = Math.max(1, Math.ceil(total / 20));
    for (const _order of orders) {
      processed += 1;
      try {
        const mapping = await getMappingByShopifyId("order", String(_order.id));
        if (mapping?.alegraId) {
          skipped += 1;
        } else {
          const payload = mapOrderToPayload(_order);
          const result = await syncShopifyOrderToAlegra(payload);
          if (result && typeof result === "object" && "skipped" in result) {
            skipped += 1;
          } else if (result && typeof result === "object" && (result as { handled?: boolean }).handled === false) {
            failed += 1;
          } else {
            synced += 1;
          }
        }
      } catch {
        failed += 1;
      }
      if (processed % step === 0 || processed === total) {
        sendStream({ type: "progress", processed, total, synced, skipped, failed });
      }
    }
    const responsePayload = { ok: true, count: total, orders, synced, skipped, failed };
    if (stream) {
      sendStream({ type: "complete", processed, total, ...responsePayload });
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "success",
        message: "Sync pedidos ok",
        request: { filters },
        response: { count: total, processed, total, synced, skipped, failed },
      });
      return;
    }
    res.json(responsePayload);
    await safeCreateLog({
      entity: "orders_sync",
      direction: "shopify->alegra",
      status: "success",
      message: "Sync pedidos ok",
      request: { filters },
      response: { count: total, processed, total, synced, skipped, failed },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders sync error";
    if (stream) {
      sendStream({ type: "error", error: message });
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "fail",
        message,
        request: { filters },
      });
      return;
    }
    res.status(500).json({ error: message });
    await safeCreateLog({
      entity: "orders_sync",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { filters },
    });
  }
}

export async function stopProductsSyncHandler(req: Request, res: Response) {
  const requestedId = String(req.body?.syncId || "").trim();
  if (!activeProductsSync) {
    res.status(200).json({ ok: false, canceled: false, reason: "no_active_sync" });
    return;
  }
  if (requestedId && activeProductsSync.id !== requestedId) {
    res.status(200).json({ ok: false, canceled: false, reason: "sync_id_mismatch" });
    return;
  }
  activeProductsSync.canceled = true;
  res.status(200).json({ ok: true, canceled: true, syncId: activeProductsSync.id });
}

function isPrivateHost(hostname: string) {
  const ipVersion = net.isIP(hostname);
  if (!ipVersion) {
    return hostname === "localhost";
  }
  if (hostname === "127.0.0.1" || hostname === "::1") return true;
  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;
  if (hostname.startsWith("169.254.")) return true;
  if (hostname.startsWith("172.")) {
    const second = Number(hostname.split(".")[1] || 0);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function proxyAlegraImageHandler(req: Request, res: Response) {
  const urlParam = String(req.query.url || "");
  if (!urlParam) {
    res.status(400).json({ error: "url requerido" });
    return;
  }
  let url: URL;
  try {
    url = new URL(urlParam);
  } catch {
    res.status(400).json({ error: "url invalida" });
    return;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    res.status(400).json({ error: "protocolo no permitido" });
    return;
  }
  if (isPrivateHost(url.hostname)) {
    res.status(400).json({ error: "host no permitido" });
    return;
  }

  try {
    const headers: Record<string, string> = {};
    const alegra = await getAlegraCredential().catch(() => null);
    if (alegra) {
      const alegraBase = new URL(getAlegraBaseUrl(alegra.environment || "prod"));
      if (url.hostname === alegraBase.hostname) {
        const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
        headers.Authorization = `Basic ${auth}`;
      }
    }
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      res.status(response.status).send("Error obteniendo imagen.");
      return;
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Image proxy error" });
  }
}
