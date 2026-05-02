import type { Request, Response } from "express";

import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";
import { syncInventoryAdjustments } from "../../../../../../src/services/inventory-adjustments.service";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { clearSyncCheckpoint, getSyncCheckpoint, saveSyncCheckpoint } from "../../../../../../src/services/sync-checkpoints.service";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../../../../../../src/db";
import { consumeLimitOrBlock } from "../../../../../../src/sa/consume";
import { upsertAlegraItemsCache, type CachedAlegraItem } from "../../../../../../src/services/alegra-items-cache.service";
import { resolveStoreConfig } from "../../../../../../src/services/store-config.service";
import { getStoreConfigForDomain } from "../../../../../../src/services/store-configs.service";
import { getAlegraConnectionByDomain, getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { upsertProduct } from "../../../../../../src/services/products.service";
import { createSyncRun, finishSyncRun, isSyncRunCancelRequested } from "../../../../../../src/services/sync-runs.service";

type AnyRecord = Record<string, any>;
type StreamPayload = Record<string, unknown>;
type AlegraSearchContext = {
  batchLimit: number;
  storeDomain: string;
  shopDomainInput: string;
  onRateLimit: (waitMs: number) => void;
  searchAttempts: string[];
  setSearchMessage: (message: string) => void;
};
type QueueItem = {
  item: AlegraItem;
  priority: number;
  parentId?: string;
};

// Tipos de la API de Alegra — derivados del contrato de respuesta observado
interface AlegraWarehouse {
  id: string | number;
  availableQuantity?: number | string | null;
  quantity?: number | string | null;
}

interface AlegraInventory {
  warehouses?: AlegraWarehouse[];
  availableQuantity?: number | string | null;
  quantity?: number | string | null;
  initialQuantity?: number | string | null;
}

interface AlegraVariantAttribute {
  name?: string | null;
  label?: string | null;
  value?: string | null;
}

interface AlegraVariant {
  id?: string | number | null;
  sku?: string | null;
  barcode?: string | null;
  reference?: string | null;
  price?: unknown;
  variantAttributes?: AlegraVariantAttribute[];
  inventory?: AlegraInventory | null;
}

interface AlegraPrice {
  idPriceList?: string | number | null;
  priceListId?: string | number | null;
  id?: string | number | null;
  name?: string | null;
  type?: string | null;
  price?: number | string | null;
  priceList?: { id?: string | number | null } | null;
}

interface AlegraItem {
  id?: string | number | null;
  name?: string | null;
  reference?: string | null;
  sku?: string | null;
  code?: string | null;
  barcode?: string | null;
  status?: string | null;
  description?: string | null;
  type?: string | null;
  productType?: string | null;
  inventory?: AlegraInventory | null;
  variants?: AlegraVariant[];
  itemVariants?: AlegraVariant[];
  variantAttributes?: AlegraVariantAttribute[];
  prices?: AlegraPrice[];
  price?: AlegraPrice[] | number | string | null;
  images?: Array<{ url?: string }>;
  customFields?: Array<{ key?: string | null; name?: string | null; label?: string | null; value?: unknown }>;
  category?: { name?: string | null } | null;
  variantParent_id?: string | number | null;
  idItemParent?: string | number | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

type ProductsSyncResponsePayload = {
  ok: true;
  scanned: number;
  processed: number;
  updated: number;
  published: number;
  skipped: number;
  skippedUnpublished: number;
  unmatched: number;
  failed: number;
  rateLimitRetries: number;
  total: number | null;
  parentCount: number;
  variantCount: number;
  publishOnSync: boolean;
  updateExisting: boolean;
  publishStatus: string;
  onlyPublishedInShopify: boolean;
  syncId: string;
  message: string;
  attempts?: string[];
  events?: string[];
  inventoryAdjustments: unknown;
};

type ProductsSyncRequestLog = {
  mode: string;
  filters: AnyRecord;
  settings: AnyRecord;
  batchSize: number;
  syncId: string;
};

type ProcessProductsQueueStats = {
  published: number;
  updated: number;
  skipped: number;
  skippedUnpublished: number;
  unmatched: number;
  failed: number;
};

const PRODUCTS_SYNC_TYPE = "products_alegra_to_shopify";

function createNdjsonStream(res: Response, enabled: boolean) {
  let open = enabled;
  const send = (payload: StreamPayload) => {
    if (!open || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      open = false;
    }
  };
  const start = () => {
    if (!enabled) return;
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.on("close", () => {
      open = false;
    });
  };
  const end = () => {
    open = false;
    res.end();
  };
  return { send, start, end };
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "").trim().toLowerCase();
  if (!lowered) return fallback;
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  return fallback;
}

function resolveStreamFlag(queryValue: unknown, bodyValue: unknown) {
  if (queryValue === "1" || queryValue === "true") return true;
  return parseBooleanLike(bodyValue, false);
}

function extractIdentifier(raw: string) {
  const value = raw.trim();
  const segments = value.split(":");
  if (segments.length >= 2) return segments.slice(1).join(":").trim();
  return value;
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function looksLikeIdentifier(value: string) {
  if (!value) return false;
  if (value.length < 3) return false;
  return !value.includes(" ");
}

function createSyncId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractCustomFieldValue = (item: AlegraItem, keys: string[]) => {
  if (!Array.isArray(item.customFields)) return "";
  const loweredKeys = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return loweredKeys.includes(name);
  });
  return String(match?.value || "").trim();
};

function matchesIdentifier(item: AlegraItem, identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return false;
  const ref = normalizeIdentifier(String(item?.reference || ""));
  const barcode = normalizeIdentifier(String(item?.barcode || ""));
  const code = normalizeIdentifier(String(item?.code || ""));
  const customBarcode = normalizeIdentifier(
    extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"])
  );
  return ref === normalized || barcode === normalized || code === normalized || customBarcode === normalized;
}

const resolveItemDate = (item: AlegraItem) => {
  const raw = item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
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

function asProductsSyncSettings(value: unknown) {
  return asRecord(value);
}

function resolveShopifyPublishSettings(settings: AnyRecord) {
  return {
    status: typeof settings.status === "string" && settings.status.trim() ? settings.status : "draft",
    includeImages: parseBooleanLike(settings.includeImages, true),
    vendor: typeof settings.vendor === "string" ? settings.vendor : "",
    allowOversell: parseBooleanLike(settings.allowOversell, false),
  };
}

const parseQuantityValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizePriceId = (value?: string | number | null) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const resolvePriceListId = (price?: AlegraPrice | null) => {
  if (!price) return "";
  return normalizePriceId(price.priceListId) || normalizePriceId(price.priceList?.id) || normalizePriceId(price.id);
};

const parsePriceValue = (value?: string | number | null) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const findPriceById = (prices: AlegraPrice[], listId?: string) => {
  if (!listId) return null;
  const normalized = normalizePriceId(listId);
  return prices.find((price) => resolvePriceListId(price) === normalized) || null;
};

const findPriceByName = (prices: AlegraPrice[], keywords: string[]) => {
  return (
    prices.find((price) => {
      const name = String(price?.name || "").toLowerCase();
      const type = String(price?.type || "").toLowerCase();
      return keywords.some((keyword) => name.includes(keyword) || type.includes(keyword));
    }) || null
  );
};

const pickPriceForStore = (prices: AlegraPrice[] = [], config?: AnyRecord) => {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  if (config?.discountId) {
    const byId = findPriceById(prices, config.discountId);
    const byName = byId || findPriceByName(prices, ["descuento", "discount", "promo"]);
    const value = parsePriceValue(byName?.price);
    if (value !== null) return value;
  }
  if (config?.wholesaleId) {
    const byId = findPriceById(prices, config.wholesaleId);
    const byName = byId || findPriceByName(prices, ["wholesale", "mayorista"]);
    const value = parsePriceValue(byName?.price);
    if (value !== null) return value;
  }
  if (config?.generalId) {
    const byId = findPriceById(prices, config.generalId);
    const byName = byId || findPriceByName(prices, ["general", "base"]);
    const value = parsePriceValue(byName?.price);
    if (value !== null) return value;
  }
  const fallback =
    prices.find((price) =>
      String(price?.name || "")
        .toLowerCase()
        .includes("general")
    ) || prices[0];
  return parsePriceValue(fallback?.price ?? undefined);
};

const normalizeImageUrls = (images: Array<{ url?: string } | string> = []) =>
  images
    .map((image) => (typeof image === "string" ? image : image?.url))
    .filter((url): url is string => typeof url === "string" && url.length > 0);

const collectOptionLabels = (variants: AlegraVariant[] = []) => {
  const labels: string[] = [];
  variants.forEach((variant) => {
    if (!Array.isArray(variant?.variantAttributes)) return;
    variant.variantAttributes.forEach((attr: AlegraVariantAttribute) => {
      const label = attr?.label?.trim?.();
      if (label && !labels.includes(label)) labels.push(label);
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

const resolveInventoryQuantity = (inventory: AlegraInventory | null | undefined, warehouseIds: string[]) => {
  if (!inventory) return 0;
  if (warehouseIds.length && Array.isArray(inventory.warehouses)) {
    return inventory.warehouses
      .filter((warehouse: AlegraWarehouse) => warehouseIds.includes(String(warehouse.id)))
      .reduce((acc: number, warehouse: AlegraWarehouse) => acc + Number(warehouse.availableQuantity || 0), 0);
  }
  return Number(inventory.quantity ?? inventory.availableQuantity ?? 0) || 0;
};

const resolveInventoryQuantityForFilter = (inventory: AlegraInventory | null | undefined, warehouseIds: string[]) => {
  if (!inventory) return null;
  const warehouses = Array.isArray(inventory.warehouses) ? inventory.warehouses : [];
  if (warehouseIds.length && warehouses.length) {
    const totals = warehouses.reduce(
      (acc: { sum: number; count: number }, warehouse: AlegraWarehouse) => {
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
  const initialQuantity = inventory && "initialQuantity" in inventory ? inventory.initialQuantity : undefined;
  const raw = inventory.quantity ?? inventory.availableQuantity ?? initialQuantity;
  if (raw === null || raw === undefined || raw === "") return null;
  return parseQuantityValue(raw);
};

const resolveItemQuantityForFilter = (item: AlegraItem, warehouseIds: string[]) => {
  const base = resolveInventoryQuantityForFilter(item.inventory, warehouseIds);
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  if (!variants.length) return base;
  const totals = variants.reduce(
    (acc: { sum: number; count: number }, variant: AlegraVariant) => {
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

const shouldSyncByWarehouse = (inventory: AlegraInventory | null | undefined, warehouseIds: string[]) => {
  if (!warehouseIds.length) return true;
  const warehouses = Array.isArray(inventory?.warehouses) ? inventory.warehouses : [];
  if (!warehouses.length) return true;
  return warehouses.some((warehouse: AlegraWarehouse) => warehouseIds.includes(String(warehouse.id)));
};

const buildShopifyPayload = (
  alegraItem: AlegraItem,
  settings: { status?: string; includeImages?: boolean; vendor?: string; allowOversell?: boolean },
  warehouseIds: string[],
  includeInventory: boolean,
  priceConfig?: AnyRecord,
  trackInventory: boolean = true
) => {
  const inventoryManagement = trackInventory ? "shopify" : null;
  const inventoryPolicy = settings.allowOversell ? "continue" : "deny";
  const images = normalizeImageUrls(alegraItem.images || []);
  const itemVariants = Array.isArray(alegraItem.itemVariants) ? alegraItem.itemVariants : [];
  const optionLabels = collectOptionLabels(itemVariants);
  const categoryName = alegraItem?.category?.name;
  const tags = [`Alegra_ID_${alegraItem.id ?? ""}`];
  if (categoryName) tags.push(categoryName);

  const baseVariant = {
    sku:
      alegraItem.reference ||
      alegraItem.barcode ||
      extractCustomFieldValue(alegraItem, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
      "",
    price: pickPriceForStore(Array.isArray(alegraItem.price) ? alegraItem.price : undefined, priceConfig)?.toString() ?? "0",
    inventory_policy: inventoryPolicy,
    inventory_management: inventoryManagement,
    inventory_quantity: includeInventory && trackInventory ? resolveInventoryQuantity(alegraItem.inventory, warehouseIds) : 0,
  };

  const variants =
    itemVariants.length > 0
      ? itemVariants.map((variant: AlegraVariant) => ({
          sku:
            variant.reference ||
            variant.barcode ||
            alegraItem.reference ||
            alegraItem.barcode ||
            extractCustomFieldValue(alegraItem, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]) ||
            "",
          price: pickPriceForStore(Array.isArray(variant.price) ? (variant.price as AlegraPrice[]) : undefined, priceConfig)?.toString() ?? "0",
          inventory_policy: inventoryPolicy,
          inventory_management: inventoryManagement,
          inventory_quantity: includeInventory && trackInventory ? resolveInventoryQuantity(variant.inventory, warehouseIds) : 0,
          barcode: variant.id ? `ALT-${variant.id}` : undefined,
          ...mapVariantOptions(variant.variantAttributes || [], optionLabels),
        }))
      : [{ ...baseVariant, barcode: alegraItem.id ? `ALT-${alegraItem.id}` : undefined }];

  return {
    product: {
      title: alegraItem.name || "Producto Alegra",
      body_html: alegraItem.description ? `<strong>Descripcion tecnica:</strong> ${alegraItem.description}` : undefined,
      vendor: settings.vendor || process.env.SHOPIFY_VENDOR || "" || "Alegra",
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

export function parseProductsSyncRequest(req: Request) {
  const { mode = "full", batchSize = 5, filters = {}, settings = {} } = req.body || {};
  const typedFilters = asRecord(filters);
  const typedSettings = asProductsSyncSettings(settings);
  const maxItems = Number.isFinite(Number(typedFilters.limit)) ? Number(typedFilters.limit) : null;
  const onlyActive = parseBooleanLike(typedFilters.onlyActive, true);
  const includeInventory = parseBooleanLike(typedFilters.includeInventory, true);
  const onlyWithImages =
    typedFilters.onlyWithImages === true ||
    ["true", "1", "yes", "on"].includes(String(typedFilters.onlyWithImages ?? "").trim().toLowerCase());
  const warehouseIdsRaw = Array.isArray(typedFilters.warehouseIds) ? typedFilters.warehouseIds : [];
  const requestedWarehouseIds = warehouseIdsRaw.map((id: unknown) => String(id || "").trim()).filter(Boolean);
  const shopDomainInput = typeof req.body?.shopDomain === "string" ? String(req.body.shopDomain).trim() : "";
  const safeBatchSize = Math.max(1, Math.min(Number(batchSize) || 5, 10));
  const hasDateFilter = Boolean(typedFilters.dateStart || typedFilters.dateEnd);
  const rawQuery = typedFilters.query ? extractIdentifier(String(typedFilters.query)) : "";
  const effectiveMode = mode;
  const publishOnSync = parseBooleanLike(typedSettings.publishOnSync, true);
  const onlyPublishedInShopify = parseBooleanLike(typedSettings.onlyPublishedInShopify, true);
  const bypassPublishedFilter = Boolean(typedFilters.query);
  const stream = resolveStreamFlag(req.query.stream, req.body?.stream);
  const usesCheckpoint = false;

  return {
    mode,
    batchSize,
    filters: typedFilters,
    settings: typedSettings,
    syncSettings: typedSettings,
    maxItems,
    onlyActive,
    includeInventory,
    onlyWithImages,
    requestedWarehouseIds,
    shopDomainInput,
    safeBatchSize,
    hasDateFilter,
    rawQuery,
    hasIdentifierQuery: looksLikeIdentifier(rawQuery),
    effectiveMode,
    publishOnSync,
    onlyPublishedInShopify,
    bypassPublishedFilter,
    stream,
    usesCheckpoint,
  };
}

function normalizeShopDomain(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

async function getAlegraConfig() {
  const alegra = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  return { baseUrl, auth };
}

async function getAlegraConfigForStore(shopDomain?: string) {
  const normalized = shopDomain ? String(shopDomain).trim() : "";
  if (normalized) {
    const conn = await getAlegraConnectionByDomain(normalized);
    const baseUrl = getAlegraBaseUrl(conn.environment || "prod");
    const auth = Buffer.from(`${conn.email}:${conn.apiKey}`).toString("base64");
    return { baseUrl, auth };
  }
  return getAlegraConfig();
}

async function fetchAlegra(path: string, query?: URLSearchParams, shopDomain?: string) {
  const { baseUrl, auth } = await getAlegraConfigForStore(shopDomain);
  const url = query ? `${baseUrl}${path}?${query.toString()}` : `${baseUrl}${path}`;
  const timeoutMs = Number(process.env.ALEGRA_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
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

function asAlegraItemsListPayload(value: unknown) {
  return asRecord(value);
}

function extractAlegraItemsList(payload: AnyRecord) {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function asShopifyProductCreateResponse(value: unknown) {
  return asRecord(value);
}

function getShopifyProductId(value: unknown): string {
  const response = asShopifyProductCreateResponse(value);
  const rawId = response.product?.id;
  if (typeof rawId === "string" && rawId.trim()) return rawId;
  if (typeof rawId === "number" && Number.isFinite(rawId)) return String(rawId);
  return "";
}

async function getShopifyConfig(shopDomain?: string) {
  const normalized = shopDomain ? normalizeShopDomain(String(shopDomain)) : "";
  const connection = normalized ? await getShopifyConnectionByDomain(normalized) : null;
  const shopify = connection ? null : await getShopifyCredential();
  const rawDomain = connection?.shopDomain || shopify?.shopDomain || "";
  const cleanedDomain = normalizeShopDomain(rawDomain);
  return {
    shopDomain: cleanedDomain,
    baseAdmin: `https://${cleanedDomain}/admin`,
    accessToken: connection?.accessToken || shopify?.accessToken || "",
    apiVersion: resolveShopifyApiVersion(shopify?.apiVersion),
    vendorDefault: process.env.SHOPIFY_VENDOR || "",
    locationId: shopify?.locationId || "",
  };
}

async function fetchShopify(
  path: string,
  options: RequestInit = {},
  configOverride?: Awaited<ReturnType<typeof getShopifyConfig>> | null
) {
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

const persistProductsFromAlegra = async (items: AlegraItem[], shopDomainInput = "", options?: { updateExisting?: boolean }) => {
  if (!Array.isArray(items) || items.length === 0) return;
  let shopDomain = normalizeShopDomain(String(shopDomainInput || ""));
  if (!shopDomain) {
    try {
      const shopify = await getShopifyCredential();
      shopDomain = shopify?.shopDomain ? normalizeShopDomain(String(shopify.shopDomain)) : "";
    } catch {
      shopDomain = "";
    }
  }
  await Promise.all(
    items.map(async (item) => {
      const sourceUpdatedAt = resolveItemDate(item);
      const inventoryQuantity = resolveItemQuantityForFilter(item, []);
      const warehouseIds = Array.isArray(item.inventory?.warehouses)
        ? item.inventory.warehouses.map((warehouse: AlegraWarehouse) => String(warehouse?.id || "")).filter(Boolean)
        : [];
      await upsertProduct(
        {
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
        },
        { mode: options?.updateExisting === false ? "insert_only" : "upsert" }
      );
    })
  );
};

const mergeItemVariants = (parent: AlegraItem, incoming: AlegraVariant[]) => {
  const base = Array.isArray(parent.itemVariants) ? parent.itemVariants : [];
  return { ...parent, itemVariants: dedupeVariants([...base, ...incoming]) };
};

const collectItemIdentifiers = (item: AlegraItem) => {
  const identifiers: string[] = [];
  const push = (value?: string | number) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed) identifiers.push(trimmed);
  };
  push(item.reference ?? undefined);
  push(item.barcode ?? undefined);
  push(item.code ?? undefined);
  push(extractCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]));
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  variants.forEach((variant: AlegraVariant) => {
    push(variant.reference ?? undefined);
    push(variant.barcode ?? undefined);
  });
  return Array.from(new Set(identifiers));
};

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore
  }
};

function resolveAlegraShopDomain(storeDomain: string, shopDomainInput: string) {
  return storeDomain || shopDomainInput || undefined;
}

async function hydrateAlegraItems(items: AlegraItem[], context: { storeDomain: string; shopDomainInput: string; onRateLimit: (waitMs: number) => void }) {
  const ids = items.map((item) => item?.id).filter(Boolean);
  if (!ids.length) return items;
  const detailQuery = new URLSearchParams();
  detailQuery.set("fields", "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code");
  detailQuery.set("mode", "advanced");
  const shopDomain = resolveAlegraShopDomain(context.storeDomain, context.shopDomainInput);
  const detailResponses = await Promise.all(
    ids.map(async (id) => {
      const response = await fetchAlegraWithRetry(`/items/${id}`, detailQuery, shopDomain, { onRetry: context.onRateLimit });
      if (!response.ok) return null;
      return (await response.json()) as AlegraItem;
    })
  );
  return detailResponses.filter(Boolean);
}

async function fetchAlegraItemsWithIdentifierQuery(queryValue: string, context: AlegraSearchContext) {
  const base = new URLSearchParams();
  base.set("metadata", "true");
  base.set("limit", String(context.batchLimit));
  const shopDomain = resolveAlegraShopDomain(context.storeDomain, context.shopDomainInput);
  const variants = [`reference:${queryValue}`, `barcode:${queryValue}`, `code:${queryValue}`, `name:${queryValue}`, queryValue];
  for (const variant of variants) {
    const attempt = new URLSearchParams(base);
    attempt.set("query", variant);
    context.searchAttempts.push(`query=${variant}`);
    const response = await fetchAlegraWithRetry("/items", attempt, shopDomain, { onRetry: context.onRateLimit });
    if (!response.ok) continue;
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    if (items.length) return hydrateAlegraItems(items, context);
  }
  for (const [key, value] of [["reference", queryValue], ["name", queryValue], ["code", queryValue], ["barcode", queryValue]] as const) {
    const attempt = new URLSearchParams(base);
    attempt.set(key, value);
    context.searchAttempts.push(`${key}=${value}`);
    const response = await fetchAlegraWithRetry("/items", attempt, shopDomain, { onRetry: context.onRateLimit });
    if (!response.ok) continue;
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
    if (items.length) return hydrateAlegraItems(items, context);
  }
  return [];
}

async function scanAlegraItemsByIdentifier(identifier: string, options: { onRateLimit?: (waitMs: number) => void } = {}, shopDomain?: string) {
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
    const response = await fetchAlegraWithRetry("/items", scanQuery, shopDomain || undefined, { onRetry: options.onRateLimit });
    if (!response.ok) break;
    const payload = await response.json();
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

async function scanAlegraItemsForSyncIdentifier(identifier: string, context: AlegraSearchContext) {
  const shopDomain = resolveAlegraShopDomain(context.storeDomain, context.shopDomainInput);
  const matches = await scanAlegraItemsByIdentifier(identifier, { onRateLimit: context.onRateLimit }, shopDomain);
  if (matches.length) {
    context.setSearchMessage(`Encontrado con busqueda profunda: ${identifier}.`);
  }
  return hydrateAlegraItems(matches, context);
}

async function prepareProductsSyncContext(params: { shopDomainInput: string; publishOnSync: boolean; syncSettings: AnyRecord; requestedWarehouseIds: string[] }) {
  const storeDomainInput = params.shopDomainInput ? normalizeShopDomain(params.shopDomainInput) : "";
  let shopifyConfig: Awaited<ReturnType<typeof getShopifyConfig>> | null = null;
  let storeDomain = storeDomainInput;
  if (params.publishOnSync) {
    shopifyConfig = await getShopifyConfig(storeDomainInput || undefined);
    storeDomain = storeDomainInput || shopifyConfig?.shopDomain || "";
    if (!storeDomain || !shopifyConfig?.accessToken) {
      throw new Error("Shopify no conectado. Configura la conexión o indica shopDomain antes de publicar.");
    }
  }
  const storeConfigFull = storeDomain
    ? await getStoreConfigForDomain(storeDomain)
    : storeDomainInput
      ? await getStoreConfigForDomain(storeDomainInput)
      : null;
  const updateExisting = parseBooleanLike(params.syncSettings.updateExisting, true);
  const trackInventory = parseBooleanLike(params.syncSettings.trackInventory, true);
  const updateExistingInShopify =
    Boolean(params.publishOnSync) && Boolean(updateExisting) && storeConfigFull?.rules?.updateInShopify !== false;
  const storeConfig = storeDomain ? await resolveStoreConfig(storeDomain) : await resolveStoreConfig(null);
  const warehouseIds = params.requestedWarehouseIds.length
    ? params.requestedWarehouseIds
    : storeConfigFull?.rules?.warehouseIds && storeConfigFull.rules.warehouseIds.length
      ? storeConfigFull.rules.warehouseIds
      : await loadWarehouseIdsForSync();
  const shopifyClient =
    params.publishOnSync && shopifyConfig
      ? new ShopifyClient({
          shopDomain: storeDomain,
          accessToken: shopifyConfig.accessToken,
          apiVersion: shopifyConfig.apiVersion,
        })
      : null;
  return { storeDomainInput, storeDomain, shopifyConfig, storeConfigFull, storeConfig, updateExisting, trackInventory, updateExistingInShopify, warehouseIds, shopifyClient };
}

function buildQueueItems(params: {
  items: AlegraItem[];
  pendingVariants: Map<string, AlegraVariant[]>;
  processedParents: Set<string>;
  toVariant: (item: AlegraItem) => AlegraVariant;
  mergePendingVariants: (item: AlegraItem) => AlegraItem;
}) {
  const queueItems: QueueItem[] = [];
  params.items.forEach((item) => {
    if (item.variantParent_id || item.idItemParent) {
      const parentId = String(item.variantParent_id || item.idItemParent || "");
      if (!parentId || params.processedParents.has(parentId)) return;
      const variant = params.toVariant(item);
      const existing = params.pendingVariants.get(parentId) || [];
      params.pendingVariants.set(parentId, [...existing, variant]);
      return;
    }
    const parentId = item.id ? String(item.id) : "";
    if (parentId && params.processedParents.has(parentId)) return;
    const mergedItem = params.mergePendingVariants(item);
    const priority = item?.type === "variantParent" ? 0 : 1;
    queueItems.push({ item: mergedItem, priority, parentId: parentId || undefined });
  });
  return queueItems;
}

async function prepareQueueItemsForSync(queueItems: QueueItem[], context: {
  includeInventory: boolean;
  publishOnSync: boolean;
  alegraSearchContext: AlegraSearchContext;
  storeDomain: string;
  shopDomainInput: string;
  updateExisting: boolean;
}) {
  if (!queueItems.length) return [];
  const cacheCandidates = queueItems.map((entry) => entry.item);
  const shouldHydrate = Boolean(context.includeInventory) || Boolean(context.publishOnSync);
  const cacheItems = shouldHydrate ? await hydrateAlegraItems(cacheCandidates, context.alegraSearchContext) : cacheCandidates;
  const nonNullCacheItems = cacheItems.filter((x): x is AlegraItem => x !== null);
  const hydratedById = new Map(nonNullCacheItems.map((item) => [String(item.id || ""), item] as const));
  queueItems.forEach((entry) => {
    const id = String(entry.item?.id || "");
    const hydrated = hydratedById.get(id);
    if (!hydrated) return;
    const incomingVariants = Array.isArray(entry.item.itemVariants) ? entry.item.itemVariants : [];
    entry.item = incomingVariants.length ? mergeItemVariants(hydrated, incomingVariants) : hydrated;
  });
  await upsertAlegraItemsCache(nonNullCacheItems as unknown as CachedAlegraItem[]);
  await persistProductsFromAlegra(nonNullCacheItems, context.storeDomain || context.shopDomainInput || "", { updateExisting: context.updateExisting });
  return nonNullCacheItems;
}

async function fetchProductsSyncBatch(context: {
  start: number;
  batchLimit: number;
  effectiveMode: string;
  filters: AnyRecord;
  onlyActive: boolean;
  hasDateFilter: boolean;
  rawQuery: string;
  triedReferenceFallback: boolean;
  alegraSearchContext: AlegraSearchContext;
  onlyWithImages: boolean;
  total: number | null;
  onRateLimit: (waitMs: number) => void;
  storeDomain: string;
  shopDomainInput: string;
}) {
  const query = new URLSearchParams();
  query.set("start", String(context.start));
  query.set("limit", String(context.batchLimit));
  query.set("metadata", "true");
  query.set("mode", "advanced");
  query.set("fields", "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,customFields,barcode,reference,code");
  const filterDateStart = typeof context.filters.dateStart === "string" ? context.filters.dateStart : "";
  const filterDateEnd = typeof context.filters.dateEnd === "string" ? context.filters.dateEnd : "";
  const filterQuery = typeof context.filters.query === "string" ? context.filters.query : "";
  if (context.effectiveMode === "filtered") {
    if (filterDateStart) query.set("updated_at_start", filterDateStart);
    if (filterDateEnd) query.set("updated_at_end", filterDateEnd);
    const dateQueryParts = [];
    if (filterDateStart) dateQueryParts.push(`created_at:>='${filterDateStart}'`);
    if (filterDateEnd) dateQueryParts.push(`created_at:<='${filterDateEnd}'`);
    const dateQuery = dateQueryParts.join(" ");
    if (filterQuery && dateQuery) query.set("query", `${filterQuery} ${dateQuery}`);
    else if (filterQuery) query.set("query", filterQuery);
    else if (dateQuery) query.set("query", dateQuery);
  }
  if (context.effectiveMode === "full" && filterQuery) query.set("query", filterQuery);

  const response = await fetchAlegraWithRetry("/items", query, context.storeDomain || context.shopDomainInput || undefined, {
    onRetry: context.onRateLimit,
  });
  if (response.status === 429) return { kind: "retry" as const };
  if (!response.ok) return { kind: "error" as const, status: response.status };

  const payload = asAlegraItemsListPayload(await response.json());
  let items = extractAlegraItemsList(payload);
  let total = Number(payload?.metadata?.total ?? payload?.metadata?.totalItems ?? context.total ?? 0) || context.total;
  if (context.onlyActive) {
    items = items.filter((item: AlegraItem) => String(item?.status || "active").toLowerCase() !== "inactive");
  }
  if (context.hasDateFilter) {
    const startDate = filterDateStart ? new Date(filterDateStart).getTime() : null;
    const endDate = filterDateEnd ? new Date(filterDateEnd).getTime() : null;
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
  const shouldScan = context.rawQuery && looksLikeIdentifier(context.rawQuery);
  if (shouldScan && items.length) {
    const matched = items.filter((item: AlegraItem) => matchesIdentifier(item, context.rawQuery));
    items = matched.length ? matched : [];
    if (matched.length) total = matched.length;
  }
  let triedReferenceFallback = context.triedReferenceFallback;
  let searchMessage = "";
  if (!items.length && context.filters.query && !triedReferenceFallback && context.start === 0) {
    triedReferenceFallback = true;
    items = await fetchAlegraItemsWithIdentifierQuery(String(context.filters.query), context.alegraSearchContext);
    if (!items.length) {
      items = await scanAlegraItemsForSyncIdentifier(String(context.filters.query), context.alegraSearchContext);
      if (!items.length) searchMessage = `No se encontraron productos para "${context.filters.query}".`;
    }
  }
  if (context.onlyWithImages) {
    items = items.filter((item: AlegraItem) => {
      if (item?.variantParent_id || item?.idItemParent) return true;
      return normalizeImageUrls(item.images || []).length > 0;
    });
  }
  return { kind: "success" as const, items, total, triedReferenceFallback, searchMessage: searchMessage || undefined };
}

async function finalizeProductsSyncBatch(params: any) {
  if (params.queueItems.length) {
    const batchNumber = Math.floor(params.start / params.batchLimit) + 1;
    const totalBatches = params.total ? Math.ceil(params.total / params.batchLimit) : null;
    const rangeStart = params.start + 1;
    const rangeEnd = params.start + params.items.length;
    params.logEvent(`Procesando batch ${batchNumber}/${totalBatches || "?"} (Items ${rangeStart}-${rangeEnd})...`);
    params.sendStream({ type: "batch_start", batchNumber, totalBatches, rangeStart, rangeEnd, total: params.total, scanned: params.scanned });
  }
  if (params.usesCheckpoint) {
    await saveSyncCheckpoint({ entity: "products", lastStart: params.start + params.batchLimit, total: params.total });
  }
  if (params.queueItems.length) params.logEvent("Batch OK");
  if (params.items.length) {
    params.sendStream({
      type: "progress",
      processed: params.processed,
      scanned: params.scanned,
      updated: params.updated,
      published: params.published,
      skipped: params.skipped,
      skippedUnpublished: params.skippedUnpublished,
      unmatched: params.unmatched,
      failed: params.failed,
      total: params.total,
      rateLimitRetries: params.rateLimitRetries,
      syncId: params.syncId,
    });
  }
}

async function cancelProductsSync(params: any) {
  params.logEvent("Sincronizacion cancelada por el usuario.");
  params.streamState.send({ type: "canceled", syncId: params.syncId });
  if (!params.stream) params.res.json({ ok: false, canceled: true, syncId: params.syncId });
  else params.streamState.end();
  await finishSyncRun(params.syncId, "canceled", params.stats);
  await safeCreateLog({
    entity: "products_sync",
    direction: "alegra->shopify",
    status: "fail",
    message: "Sync cancelado por el usuario",
    request: params.requestLog,
  });
}

async function billProductsSync(processed: number, shopDomain: string | null) {
  try {
    const amount = Number(processed || 0) || 0;
    if (amount > 0) {
      await consumeLimitOrBlock("products", {
        tenant_id: getOrgId(),
        amount,
        source: "sync/products",
        meta: { direction: "alegra->shopify", shopDomain },
      });
    }
  } catch {
    // ignore
  }
}

async function completeProductsSync(params: any) {
  if (params.stream) {
    params.streamState.send({ type: "complete", ...params.responsePayload });
    params.streamState.end();
  } else {
    params.res.json(params.responsePayload);
  }
  await safeCreateLog({
    entity: "products_sync",
    direction: "alegra->shopify",
    status: "success",
    message: "Sync productos ok",
    request: params.requestLog,
    response: params.responsePayload,
  });
  await billProductsSync(params.responsePayload.processed, params.shopDomain);
  await finishSyncRun(params.syncId, "completed", params.responsePayload);
}

async function failProductsSync(params: any) {
  if (params.stream) {
    params.streamState.send({ type: "error", error: params.message });
    params.streamState.end();
  } else {
    params.res.status(500).json({ error: params.message });
  }
  await safeCreateLog({
    entity: "products_sync",
    direction: "alegra->shopify",
    status: "fail",
    message: params.message,
    request: params.requestLog,
  });
  await finishSyncRun(params.syncId, "failed", { error: params.message });
}

async function processProductsQueue(queueItems: any[], context: any) {
  if (!queueItems.length) return;
  const sorted = queueItems.sort((a, b) => a.priority - b.priority);
  let cursor = 0;
  const worker = async () => {
    while (cursor < sorted.length) {
      if (await isSyncRunCancelRequested(context.syncId)) return;
      const current = sorted[cursor];
      cursor += 1;
      const parentId = current.parentId;
      if (!context.publishOnSync) {
        if (parentId) context.processedParents.add(parentId);
        continue;
      }
      try {
        if (!shouldSyncByWarehouse(current.item.inventory, context.warehouseIds)) {
          context.stats.skipped += 1;
          if (parentId) context.processedParents.add(parentId);
          continue;
        }
        const status = await context.resolveShopifyStatus(current.item);
        if (context.onlyPublishedInShopify && !context.bypassPublishedFilter && !status.published) {
          context.stats.skippedUnpublished += 1;
          if (parentId) context.processedParents.add(parentId);
          continue;
        }
        if (status.exists) {
          if (!context.updateExistingInShopify || !context.shopifyClient) {
            context.stats.skipped += 1;
            if (parentId) context.processedParents.add(parentId);
            continue;
          }
          const { updatedAny, unmatchedVariants } = await updateExistingShopifyProduct({
            item: current.item,
            syncSettings: context.syncSettings,
            warehouseIds: context.warehouseIds,
            includeInventory: context.includeInventory,
            storeConfig: context.storeConfig,
            trackInventory: context.trackInventory,
            resolveExistingVariant: context.resolveExistingVariant,
            withShopifyRetry: context.withShopifyRetry,
            shopifyClient: context.shopifyClient,
            shopifyProductId: status.productId,
          });
          context.stats.unmatched += unmatchedVariants;
          if (updatedAny) context.stats.updated += 1;
          else context.stats.skipped += 1;
          if (parentId) context.processedParents.add(parentId);
          continue;
        }
        await publishNewShopifyProduct({
          item: current.item,
          syncSettings: context.syncSettings,
          warehouseIds: context.warehouseIds,
          includeInventory: context.includeInventory,
          storeConfig: context.storeConfig,
          trackInventory: context.trackInventory,
          shopifyConfig: context.shopifyConfig,
          storeDomain: context.storeDomain,
        });
        context.stats.published += 1;
        if (parentId) context.processedParents.add(parentId);
      } catch {
        context.stats.failed += 1;
      }
    }
  };
  const runners = Array.from({ length: context.safeBatchSize }, () => worker());
  await Promise.all(runners);
}

function createShopifyStatusResolvers(shopifyClient: ShopifyClient | null) {
  const identifierCache = new Map<string, { exists: boolean; productId?: string; variantId?: string; inventoryItemId?: string; status?: string | null }>();
  const resolveExistingVariant = async (identifier: string) => {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized || !shopifyClient) return { exists: false };
    if (identifierCache.has(normalized)) return identifierCache.get(normalized) || { exists: false };
    const lookup = await shopifyClient.findVariantByIdentifier(identifier);
    const node = lookup.productVariants?.edges?.[0]?.node;
    const result = {
      exists: Boolean(node?.id),
      productId: node?.product?.id ? String(node.product.id) : undefined,
      variantId: node?.id ? String(node.id) : undefined,
      inventoryItemId: node?.inventoryItem?.id ? String(node.inventoryItem.id) : undefined,
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
        return {
          exists: true,
          published: status === "active",
          productId: result.productId,
          variantId: result.variantId,
          inventoryItemId: result.inventoryItemId,
        };
      }
    }
    return { exists: false, published: false };
  };
  return { resolveExistingVariant, resolveShopifyStatus };
}

async function updateExistingShopifyProduct(params: any) {
  const desiredPayload = buildShopifyPayload(
    params.item,
    { ...resolveShopifyPublishSettings(params.syncSettings), includeImages: false },
    params.warehouseIds,
    params.includeInventory,
    {
      generalId: params.storeConfig?.priceListGeneralId,
      discountId: params.storeConfig?.priceListDiscountId,
      wholesaleId: params.storeConfig?.priceListWholesaleId,
      currency: params.storeConfig?.currency,
    },
    params.trackInventory
  );
  const desiredProduct = asShopifyProductCreateResponse(desiredPayload).product;
  const desiredVariants = Array.isArray(desiredProduct?.variants) ? desiredProduct.variants : [];
  const updatedVariantIds = new Set<string>();
  let updatedAny = false;
  let unmatchedVariants = 0;
  for (const desired of desiredVariants) {
    const sku = String(desired?.sku || "").trim();
    const price = String(desired?.price || "0").trim() || "0";
    if (!sku) continue;
    const match = await params.resolveExistingVariant(sku);
    const variantId = typeof match.variantId === "string" ? match.variantId : "";
    if (!match.exists || !variantId) {
      unmatchedVariants += 1;
      continue;
    }
    if (updatedVariantIds.has(variantId)) continue;
    updatedVariantIds.add(variantId);
    await params.withShopifyRetry(() => params.shopifyClient.updateVariantPrice(variantId, price), {
      label: "updateVariantPrice",
      retries: 2,
    });
    updatedAny = true;
  }
  const desiredStatus = String(params.syncSettings.status || "draft").toLowerCase();
  if (params.shopifyProductId && (desiredStatus === "active" || desiredStatus === "draft")) {
    await params.withShopifyRetry(
      () => params.shopifyClient.updateProductStatus(String(params.shopifyProductId), desiredStatus === "active"),
      { label: "updateProductStatus", retries: 1 }
    );
  }
  return { updatedAny, unmatchedVariants };
}

async function publishNewShopifyProduct(params: any) {
  const payloadShopify = buildShopifyPayload(
    params.item,
    resolveShopifyPublishSettings(params.syncSettings),
    params.warehouseIds,
    params.includeInventory,
    {
      generalId: params.storeConfig?.priceListGeneralId,
      discountId: params.storeConfig?.priceListDiscountId,
      wholesaleId: params.storeConfig?.priceListWholesaleId,
      currency: params.storeConfig?.currency,
    },
    params.trackInventory
  );
  const publishedResult = await fetchShopify(
    "/products.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadShopify),
    },
    params.shopifyConfig
  );
  const shopifyProductId = getShopifyProductId(publishedResult);
  const sourceUpdatedAt = resolveItemDate(params.item);
  await upsertProduct({
    shopDomain: params.storeDomain,
    alegraId: params.item.id,
    shopifyId: shopifyProductId,
    name: params.item.name || null,
    reference: normalizeText(params.item.reference || params.item.code || params.item.barcode),
    sku: resolveItemSku(params.item),
    statusAlegra: params.item.status || null,
    statusShopify: typeof params.syncSettings.status === "string" && params.syncSettings.status.trim() ? params.syncSettings.status : "draft",
    inventoryQuantity: resolveItemQuantityForFilter(params.item, []),
    sourceUpdatedAt: sourceUpdatedAt !== null ? new Date(sourceUpdatedAt) : null,
    source: "alegra",
    payloadJson: params.item,
  });
}

export async function syncProductsHandler(req: Request, res: Response) {
  const parsed = parseProductsSyncRequest(req);
  const {
    filters,
    settings,
    syncSettings,
    maxItems,
    onlyActive,
    includeInventory,
    onlyWithImages,
    requestedWarehouseIds,
    shopDomainInput,
    safeBatchSize,
    rawQuery,
    hasDateFilter,
    effectiveMode,
    publishOnSync,
    onlyPublishedInShopify,
    bypassPublishedFilter,
    stream,
    usesCheckpoint,
  } = parsed;
  const batchLimit = 30;
  const batchDelayMs = 500;
  let start = 0;
  let processed = 0;
  let scanned = 0;
  let published = 0;
  let updated = 0;
  let skipped = 0;
  let skippedUnpublished = 0;
  let unmatched = 0;
  let failed = 0;
  let rateLimitRetries = 0;
  let total: number | null = null;
  let parentCount = 0;
  let variantCount = 0;
  const events: string[] = [];
  const streamState = createNdjsonStream(res, stream);
  const sendStream = streamState.send;
  const startedAt = Date.now();
  const syncId = createSyncId();
  const requestLog: ProductsSyncRequestLog = {
    mode: effectiveMode,
    filters,
    settings,
    batchSize: safeBatchSize,
    syncId,
  };
  const processedParents = new Set<string>();
  const pendingVariants = new Map<string, AlegraVariant[]>();

  try {
    await createSyncRun(syncId, PRODUCTS_SYNC_TYPE, {
      startedAt,
      mode: effectiveMode,
      shopDomain: shopDomainInput || null,
    });
    streamState.start();
    if (usesCheckpoint) {
      const checkpoint = await getSyncCheckpoint("products");
      if (checkpoint?.lastStart) {
        start = checkpoint.lastStart;
        total = checkpoint.total ?? total;
      }
    }
    const { storeDomain, shopifyConfig, storeConfig, updateExisting, trackInventory, updateExistingInShopify, warehouseIds, shopifyClient } =
      await prepareProductsSyncContext({
        shopDomainInput,
        publishOnSync,
        syncSettings,
        requestedWarehouseIds,
      });

    const withShopifyRetry = async <T>(fn: () => Promise<T>, options: { label: string; retries?: number } = { label: "shopify_call" }) => {
      const retries = typeof options.retries === "number" && Number.isFinite(options.retries) ? Math.max(0, options.retries) : 2;
      let attempt = 0;
      while (true) {
        try {
          return await fn();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || "");
          const retryable =
            message.includes("429") ||
            message.toLowerCase().includes("throttled") ||
            message.toLowerCase().includes("rate limit");
          if (!retryable || attempt >= retries) throw error;
          const waitMs = 1200 * Math.pow(2, attempt);
          logEvent(`Shopify rate limit (${options.label}), reintento en ${Math.round(waitMs / 1000)}s...`);
          await sleep(waitMs);
          attempt += 1;
        }
      }
    };

    const { resolveExistingVariant, resolveShopifyStatus } = createShopifyStatusResolvers(shopifyClient);
    const toVariant = (item: AlegraItem): AlegraVariant => ({
      id: item.id,
      barcode: item.barcode,
      reference: item.reference,
      price: item.price,
      inventory: item.inventory,
      variantAttributes: item.variantAttributes,
    });
    const mergePendingVariants = (item: AlegraItem): AlegraItem => {
      const parentId = item.id ? String(item.id) : "";
      if (!parentId || !pendingVariants.has(parentId)) return item;
      const variants = pendingVariants.get(parentId) || [];
      pendingVariants.delete(parentId);
      return mergeItemVariants(item, variants);
    };
    const logEvent = (message: string) => {
      events.push(message);
      if (events.length > 200) events.shift();
    };
    const onRateLimit = (waitMs: number) => {
      rateLimitRetries += 1;
      logEvent(`429 Alegra, reintento en ${Math.round(waitMs / 1000)}s...`);
      sendStream({ type: "rate_limit", waitMs, retries: rateLimitRetries });
    };
    let hasMore = true;
    let triedReferenceFallback = false;
    const searchAttempts: string[] = [];
    let searchMessage = "";
    const alegraSearchContext = {
      batchLimit,
      storeDomain,
      shopDomainInput,
      onRateLimit,
      searchAttempts,
      setSearchMessage: (message: string) => {
        searchMessage = message;
      },
    };

    sendStream({ type: "start", startedAt, total, batchLimit, syncId, mode: effectiveMode });

    while (hasMore) {
      if (await isSyncRunCancelRequested(syncId)) {
        await cancelProductsSync({
          stream,
          res,
          syncId,
          streamState,
          logEvent,
          requestLog,
          stats: { processed, published, updated, skipped, unmatched, failed },
        });
        return;
      }
      const batch = await fetchProductsSyncBatch({
        start,
        batchLimit,
        effectiveMode,
        filters,
        onlyActive,
        hasDateFilter,
        rawQuery,
        onlyWithImages,
        storeDomain,
        shopDomainInput,
        onRateLimit,
        alegraSearchContext,
        triedReferenceFallback,
        total,
      });
      if (batch.kind === "retry") {
        logEvent("Límite Alegra persistente, reintentando batch...");
        sendStream({ type: "batch_retry", start });
        await sleep(batchDelayMs * 4);
        continue;
      }
      if (batch.kind === "error") {
        logEvent(`Error Alegra HTTP ${batch.status}, saltando batch.`);
        sendStream({ type: "batch_error", start, status: batch.status });
        start += batchLimit;
        if (total !== null && start >= total) hasMore = false;
        await sleep(batchDelayMs);
        continue;
      }
      let items = batch.items;
      total = batch.total;
      triedReferenceFallback = batch.triedReferenceFallback;
      if (batch.searchMessage) searchMessage = batch.searchMessage;
      items.forEach((item: AlegraItem) => {
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

      const queueItems = buildQueueItems({ items, pendingVariants, processedParents, toVariant, mergePendingVariants });
      if (queueItems.length) {
        await prepareQueueItemsForSync(queueItems, {
          includeInventory,
          publishOnSync,
          storeDomain,
          shopDomainInput,
          updateExisting,
          alegraSearchContext,
        });
      }

      const queueStats: ProcessProductsQueueStats = { published, updated, skipped, skippedUnpublished, unmatched, failed };
      await processProductsQueue(queueItems, {
        syncId,
        publishOnSync,
        warehouseIds,
        onlyPublishedInShopify,
        bypassPublishedFilter,
        updateExistingInShopify,
        shopifyClient,
        syncSettings,
        includeInventory,
        storeConfig,
        trackInventory,
        resolveExistingVariant,
        resolveShopifyStatus,
        withShopifyRetry,
        shopifyConfig,
        storeDomain,
        processedParents,
        safeBatchSize,
        stats: queueStats,
      });
      published = queueStats.published;
      updated = queueStats.updated;
      skipped = queueStats.skipped;
      skippedUnpublished = queueStats.skippedUnpublished;
      unmatched = queueStats.unmatched;
      failed = queueStats.failed;
      scanned += items.length;
      processed += queueItems.length;
      await finalizeProductsSyncBatch({
        start,
        batchLimit,
        total,
        items,
        queueItems,
        scanned,
        processed,
        rateLimitRetries,
        syncId,
        usesCheckpoint,
        updated,
        published,
        skipped,
        skippedUnpublished,
        unmatched,
        failed,
        logEvent,
        sendStream,
      });
      if (maxItems && processed >= maxItems) {
        hasMore = false;
        break;
      }
      start += batchLimit;
      if (items.length === 0 || (total !== null && start >= total)) hasMore = false;
      if (hasMore) await sleep(batchDelayMs);
    }

    if (pendingVariants.size) logEvent(`Variantes sin padre: ${pendingVariants.size}.`);
    logEvent(
      `Sincronizacion completada: ${scanned} items revisados, ${processed} procesados, ${unmatched} sin match, ${rateLimitRetries} reintentos por tasa, ${failed} errores.`
    );
    let inventoryAdjustmentsResult: unknown = null;
    if (publishOnSync && includeInventory) {
      try {
        inventoryAdjustmentsResult = await syncInventoryAdjustments(new URLSearchParams(), {
          shopDomain: storeDomain || shopDomainInput || undefined,
        });
      } catch (error) {
        inventoryAdjustmentsResult = {
          error: error instanceof Error ? error.message : "Inventory adjustments sync failed",
        };
      }
    } else {
      inventoryAdjustmentsResult = {
        skipped: true,
        reason: publishOnSync ? "include_inventory_off" : "publish_off",
      };
    }
    if (usesCheckpoint) {
      await clearSyncCheckpoint("products");
    }
    const responsePayload: ProductsSyncResponsePayload = {
      ok: true,
      scanned,
      processed,
      updated,
      published,
      skipped,
      skippedUnpublished,
      unmatched,
      failed,
      rateLimitRetries,
      total,
      parentCount,
      variantCount,
      publishOnSync,
      updateExisting,
      publishStatus: typeof syncSettings.status === "string" && syncSettings.status.trim() ? syncSettings.status : "draft",
      onlyPublishedInShopify,
      syncId,
      message:
        searchMessage ||
        (usesCheckpoint && scanned === 0 && total !== null
          ? "No hubo productos pendientes para procesar en el sync masivo. Usa sincronización filtrada para validar o vuelve a correr el masivo para reiniciar desde checkpoint limpio."
          : ""),
      attempts: searchAttempts.length ? searchAttempts : undefined,
      events: events.length ? events : undefined,
      inventoryAdjustments: inventoryAdjustmentsResult,
    };
    await completeProductsSync({
      stream,
      res,
      responsePayload,
      requestLog,
      syncId,
      streamState,
      shopDomain: storeDomain || shopDomainInput || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync error";
    await failProductsSync({ stream, res, message, requestLog, syncId, streamState });
  }
}
