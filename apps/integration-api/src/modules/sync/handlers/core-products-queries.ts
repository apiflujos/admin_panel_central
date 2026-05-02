import type { Request, Response } from "express";
import net from "net";

import { AlegraClient } from "../../../../../../src/connectors/alegra";
import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getAlegraConnectionByDomain, getAlegraConnectionByStoreId, getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";
import { syncInventoryAdjustments } from "../../../../../../src/services/inventory-adjustments.service";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import {
  countAlegraItemsCache,
  listAlegraItemsCache,
  upsertAlegraItemsCache,
} from "../../../../../../src/services/alegra-items-cache.service";
import { upsertProduct, listProducts } from "../../../../../../src/services/products.service";

type AlegraPrice = {
  name?: string;
  type?: string;
  price?: number | string;
  id?: string | number;
  priceListId?: string | number;
  priceList?: { id?: string | number };
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

type JsonObject = Record<string, unknown>;

type AlegraItemsListPayload = {
  items?: AlegraItem[];
  data?: AlegraItem[];
  metadata?: {
    total?: unknown;
    totalItems?: unknown;
    filtered?: unknown;
    source?: unknown;
  } & JsonObject;
} & JsonObject;

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

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

const extractCustomFieldValue = (item: AlegraItem, keys: string[]) => {
  if (!Array.isArray(item.customFields)) return "";
  const loweredKeys = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return loweredKeys.includes(name);
  });
  return String(match?.value || "").trim();
};

const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

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

const resolveItemSku = (item: AlegraItem) => {
  const fromItem =
    item.reference ||
    item.code ||
    item.barcode ||
    extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]);
  if (fromItem) return normalizeText(fromItem);
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  const firstVariant = variants[0];
  return normalizeText(
    firstVariant?.reference ||
      firstVariant?.barcode ||
      extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"])
  );
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const resolveInventoryQuantityForFilter = (inventory: AlegraItem["inventory"] | AlegraVariant["inventory"] | undefined, warehouseIds: string[]) => {
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
  const raw = inventory.quantity ?? inventory.availableQuantity;
  if (raw === null || raw === undefined || (typeof raw === "string" && raw === "")) return null;
  return parseQuantityValue(raw);
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
      ? variant.inventory.warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)))
      : false
  );
};

const persistProductsFromAlegra = async (items: AlegraItem[], shopDomainInput = "") => {
  if (!Array.isArray(items) || items.length === 0) return;
  const normalize = (value: string) =>
    value
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
  let shopDomain = normalize(String(shopDomainInput || ""));
  if (!shopDomain) {
    try {
      const shopify = await getShopifyCredential();
      shopDomain = shopify?.shopDomain ? normalize(String(shopify.shopDomain)) : "";
    } catch {
      shopDomain = "";
    }
  }
  await Promise.all(
    items.map(async (item) => {
      const sourceUpdatedAt = resolveItemDate(item);
      const inventoryQuantity = resolveItemQuantityForFilter(item, []);
      const warehouseIds = Array.isArray(item.inventory?.warehouses)
        ? item.inventory.warehouses.map((warehouse) => String(warehouse?.id || "")).filter(Boolean)
        : [];
      await upsertProduct({
        shopDomain,
        alegraId: item.id,
        name: item.name || null,
        reference: normalizeText(item.reference || item.code || item.barcode),
        sku: resolveItemSku(item),
        statusAlegra: item.status || null,
        inventoryQuantity: typeof inventoryQuantity === "number" ? inventoryQuantity : null,
        warehouseIds: warehouseIds.length ? warehouseIds : null,
        sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : null,
        source: "alegra",
        payloadJson: item,
      });
    })
  );
};

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

async function getAlegraConfig() {
  const alegra = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  return { baseUrl, auth };
}

async function getAlegraConfigForStore(shopDomain?: string, storeId?: number) {
  const normalized = shopDomain ? String(shopDomain).trim() : "";
  if (Number.isFinite(storeId)) {
    const conn = await getAlegraConnectionByStoreId(Number(storeId));
    const baseUrl = getAlegraBaseUrl(conn.environment || "prod");
    const auth = Buffer.from(`${conn.email}:${conn.apiKey}`).toString("base64");
    return { baseUrl, auth };
  }
  if (normalized) {
    const conn = await getAlegraConnectionByDomain(normalized);
    const baseUrl = getAlegraBaseUrl(conn.environment || "prod");
    const auth = Buffer.from(`${conn.email}:${conn.apiKey}`).toString("base64");
    return { baseUrl, auth };
  }
  return getAlegraConfig();
}

async function fetchAlegra(path: string, query?: URLSearchParams, shopDomain?: string, storeId?: number) {
  const { baseUrl, auth } = await getAlegraConfigForStore(shopDomain, storeId);
  const url = query ? `${baseUrl}${path}?${query.toString()}` : `${baseUrl}${path}`;
  const timeoutMs = Number(process.env.ALEGRA_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAlegraWithRetry(
  path: string,
  query: URLSearchParams | undefined,
  shopDomain: string | undefined,
  options: { maxRetries?: number; backoffBaseMs?: number; onRetry?: (waitMs: number) => void } = {}
) {
  const maxRetries = options.maxRetries ?? 5;
  const backoffBaseMs = options.backoffBaseMs ?? 2000;
  let attempt = 0;
  while (true) {
    const response = await fetchAlegra(path, query, shopDomain);
    if (response.status !== 429) return response;
    if (attempt >= maxRetries) return response;
    const waitMs = backoffBaseMs * Math.pow(2, attempt);
    options.onRetry?.(waitMs);
    await sleep(waitMs);
    attempt += 1;
  }
}

function asAlegraItemsListPayload(value: unknown): AlegraItemsListPayload {
  return asRecord(value) as AlegraItemsListPayload;
}

function extractAlegraItemsList(payload: AlegraItemsListPayload): AlegraItem[] {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

async function scanAlegraItemsByIdentifier(
  identifier: string,
  options: { onRateLimit?: (waitMs: number) => void } = {},
  shopDomain?: string
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
    const response = await fetchAlegraWithRetry("/items", scanQuery, shopDomain || undefined, {
      onRetry: options.onRateLimit,
    });
    if (!response.ok) break;
    const payload = (await response.json()) as {
      items?: AlegraItem[];
      data?: AlegraItem[];
      metadata?: { total?: number; totalItems?: number };
    };
    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    scanTotal = payload?.metadata?.total ?? payload?.metadata?.totalItems ?? scanTotal;
    for (const item of items) {
      if (matchesIdentifier(item, normalized)) matches.push(item);
    }
    if (matches.length) break;
    scanStart += scanLimit;
    pages += 1;
    if (items.length === 0 || (scanTotal !== null && scanStart >= scanTotal)) break;
    await sleep(500);
  }
  return matches;
}

async function fetchShopifyResponse(path: string, options: RequestInit = {}, shopDomain?: string) {
  const connection = shopDomain ? await getShopifyConnectionByDomain(shopDomain) : await getShopifyCredential();
  const domain = connection.shopDomain;
  const accessToken = connection.accessToken;
  const apiVersion = resolveShopifyApiVersion((connection as { apiVersion?: string }).apiVersion);
  const url = `https://${domain}/admin/api/${apiVersion}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Shopify HTTP ${response.status}: ${text}`);
  }
  return response;
}

function isPrivateHost(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (net.isIP(lower) === 6) return lower === "::1";
  if (net.isIP(lower) !== 4) return false;
  if (lower.startsWith("10.") || lower.startsWith("127.") || lower.startsWith("192.168.")) return true;
  if (lower.startsWith("169.254.")) return true;
  if (lower.startsWith("172.")) {
    const second = Number(lower.split(".")[1] || 0);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function listAlegraItemsHandler(req: Request, res: Response) {
  try {
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const inStockOnly =
      String(req.query.inStockOnly || "").toLowerCase() === "1" ||
      String(req.query.inStockOnly || "").toLowerCase() === "true";
    const warehouseFilterIds = String(req.query.warehouseIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const rawQueryValue = typeof req.query.query === "string" ? req.query.query : "";
    const identifierQuery = extractIdentifier(rawQueryValue);
    const source = String(req.query.source || "auto").toLowerCase();
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    query.delete("shopDomain");
    query.delete("inStockOnly");
    query.delete("warehouseIds");
    if (!query.has("mode")) query.set("mode", "advanced");
    if (!query.has("fields")) {
      query.set(
        "fields",
        "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
    }
    if (!query.has("metadata")) query.set("metadata", "true");
    const requestedFields = String(query.get("fields") || "");
    const scanLimit = Number(query.get("limit") || "30");
    const maxPages = 6;
    let page = 0;
    let scanStart = Number(query.get("start") || "0");
    let payload: AlegraItemsListPayload | null = null;
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
                warehouseFilterIds.length === 0 || matchesItemWarehouses(item, warehouseFilterIds);
              if (!matchesWarehouse) return false;
              if (!inStockOnly) return true;
              const qty = resolveItemQuantityForFilter(item, warehouseFilterIds);
              return qty === null ? true : qty > 0;
            });
          }
          cachedItems = cachedItems.concat(filtered);
          if (cachedBatch.length < scanLimit) break;
          if (!shouldFilter) break;
          cachedStart += scanLimit;
          cachedPage += 1;
        }
        const sliced = cachedItems.slice(0, scanLimit);
        const wantsImages = requestedFields.includes("images");
        const cacheHasImagesKey =
          sliced.length > 0 &&
          sliced.some((item) => item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "images"));

        if (!(wantsImages && !cacheOnly && cachedTotal > 0 && !cacheHasImagesKey)) {
          res.status(200).json({
            metadata: { total: cachedTotalResult, filtered: shouldFilter, source: "cache" },
            data: sliced,
          });
          void persistProductsFromAlegra(cachedItems, shopDomain || "").catch(() => null);
          return;
        }
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
        "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
      detailQuery.set("mode", "advanced");
      return Promise.all(
        input.map(async (item) => {
          if (!item?.id) return item;
          if (!needsInventoryForFilter(item)) return item;
          const detailResponse = await fetchAlegraWithRetry(`/items/${item.id}`, detailQuery, shopDomain || undefined);
          if (!detailResponse.ok) return item;
          return (await detailResponse.json()) as AlegraItem;
        })
      );
    };

    const filterItems = (input: AlegraItem[]) => {
      if (!shouldFilter) return input;
      return input.filter((item) => {
        const matchesWarehouse = warehouseFilterIds.length === 0 || matchesItemWarehouses(item, warehouseFilterIds);
        if (!matchesWarehouse) return false;
        if (!inStockOnly) return true;
        const qty = resolveItemQuantityForFilter(item, warehouseFilterIds);
        return qty === null ? true : qty > 0;
      });
    };

    while (page === 0 || (items.length < scanLimit && page < maxPages)) {
      query.set("start", String(scanStart));
      query.set("limit", String(scanLimit));
      const response = await fetchAlegra("/items", query, shopDomain || undefined);
      payload = asAlegraItemsListPayload(await response.json());
      const rawBatch = extractAlegraItemsList(payload);
      const batch = await hydrateItemsForFilter(rawBatch);
      const filtered = filterItems(batch);
      items = items.concat(filtered);
      if (total === null) {
        const metaTotal = payload.metadata?.total ?? payload.metadata?.totalItems;
        total = typeof metaTotal === "number" ? metaTotal : null;
      }
      if (batch.length < scanLimit) break;
      if (!shouldFilter) break;
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
      const hasQty = typeof inv.availableQuantity === "number" || typeof inv.quantity === "number";
      return !hasWarehouses && !hasQty;
    });
    let resolvedItems = items;
    if (needsInventoryHydration && items.length) {
      const detailQuery = new URLSearchParams();
      detailQuery.set(
        "fields",
        "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
      );
      detailQuery.set("mode", "advanced");
      resolvedItems = await Promise.all(
        items.map(async (item) => {
          if (!item?.id) return item;
          const inv = item.inventory;
          const hasWarehouses = Array.isArray(inv?.warehouses) && inv?.warehouses.length > 0;
          const hasQty = typeof inv?.availableQuantity === "number" || typeof inv?.quantity === "number";
          if (hasWarehouses || hasQty) return item;
          const detailResponse = await fetchAlegraWithRetry(`/items/${item.id}`, detailQuery, shopDomain || undefined);
          if (!detailResponse.ok) return item;
          return (await detailResponse.json()) as AlegraItem;
        })
      );
    }
    if (rawQueryValue && looksLikeIdentifier(identifierQuery)) {
      const matched = resolvedItems.filter((item: AlegraItem) => matchesIdentifier(item, identifierQuery));
      if (items.length === 0 || matched.length === 0) {
        const scanItems = await scanAlegraItemsByIdentifier(identifierQuery, {}, shopDomain || undefined);
        const detailQuery = new URLSearchParams();
        detailQuery.set(
          "fields",
          "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code,created_at,createdAt"
        );
        detailQuery.set("mode", "advanced");
        const hydrated = await Promise.all(
          scanItems.map(async (item) => {
            if (!item?.id) return null;
            const detailResponse = await fetchAlegra(`/items/${item.id}`, detailQuery, shopDomain || undefined);
            if (!detailResponse.ok) return null;
            return (await detailResponse.json()) as AlegraItem;
          })
        );
        const fullItems = hydrated.filter(Boolean) as AlegraItem[];
        const fullTotal = fullItems.length;
        const start = Number(query.get("start") || "0");
        const limit = Number(query.get("limit") || fullTotal);
        const sliced = fullItems.slice(start, start + limit);
        void persistProductsFromAlegra(sliced, shopDomain || "").catch(() => null);
        res.json({ metadata: { total: fullTotal }, data: sliced });
        return;
      }
    }
    if (Array.isArray(payload.items)) {
      payload.items = resolvedItems;
    } else if (Array.isArray(payload.data)) {
      payload.data = resolvedItems;
    } else {
      payload.items = resolvedItems;
    }
    if (!payload.metadata || typeof payload.metadata !== "object") {
      payload.metadata = {};
    }
    if (typeof total === "number") {
      payload.metadata.total = total;
    }
    payload.metadata.filtered = inStockOnly || warehouseFilterIds.length > 0;
    void upsertAlegraItemsCache(resolvedItems).catch(() => null);
    void persistProductsFromAlegra(resolvedItems, shopDomain || "").catch(() => null);
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Alegra proxy error" });
    await safeCreateLog({
      entity: "alegra_items_list",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Alegra proxy error",
      request: { query: req.query },
    });
  }
}

export async function listProductsHandler(req: Request, res: Response) {
  try {
    const start = Number(req.query.start || 0);
    const limit = Number(req.query.limit || 30);
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const inStockOnly =
      String(req.query.inStockOnly || "").toLowerCase() === "1" ||
      String(req.query.inStockOnly || "").toLowerCase() === "true";
    const warehouseIds = String(req.query.warehouseIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const result = await listProducts({
      shopDomain: shopDomain || undefined,
      query: query || undefined,
      inStockOnly,
      warehouseIds: warehouseIds.length ? warehouseIds : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 30,
      offset: Number.isFinite(start) && start > 0 ? start : 0,
    });
    res.status(200).json({ items: result.items, total: result.total });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Products list error" });
  }
}

export async function listInventoryAdjustmentsHandler(req: Request, res: Response) {
  try {
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    query.delete("shopDomain");
    if (!query.has("metadata")) query.set("metadata", "true");
    const rawLimit = Number(query.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 30) : 30;
    query.set("limit", String(limit));
    const response = await fetchAlegra("/inventory-adjustments", query, shopDomain || undefined);
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
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const query = new URLSearchParams();
    query.set("mode", "advanced");
    query.set("fields", "inventory");
    const response = await fetchAlegra(`/items/${itemId}`, query, shopDomain || undefined);
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text || "Alegra item error" });
      return;
    }
    const payload = (await response.json()) as {
      id?: string | number;
      inventory?: {
        availableQuantity?: number | string;
        warehouses?: Array<{ id?: string | number; name?: string; availableQuantity?: number | string }>;
      };
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
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    query.delete("shopDomain");
    const result = await syncInventoryAdjustments(query, { shopDomain: shopDomain || undefined });
    res.json({ ok: true, ...result });
    await safeCreateLog({
      entity: "inventory_adjustments_sync",
      direction: "alegra->shopify",
      status: "success",
      message: "Inventory adjustments sync ok",
      request: { query: Object.fromEntries(query.entries()) },
      response: asRecord(result),
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
