import type { Request, Response } from "express";

import { ShopifyClient, type ShopifyProduct } from "../../../../../../src/connectors/shopify";
import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { countAlegraItemsCache, listAlegraItemsCache } from "../../../../../../src/services/alegra-items-cache.service";
import { upsertProduct } from "../../../../../../src/services/products.service";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";
import { getAlegraConnectionByDomain, getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";

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

type BackfillProductsBody = {
  source?: unknown;
  limit?: unknown;
  dateStart?: unknown;
  dateEnd?: unknown;
  shopDomain?: unknown;
  useCache?: unknown;
  alegraStatus?: unknown;
  alegraActiveOnly?: unknown;
  shopifyPublishedOnly?: unknown;
};

type BackfillAlegraResult = {
  processed: number;
  pages: number;
  source: "cache" | "api";
  total?: number;
  status: string | null;
};

type BackfillShopifyResult = {
  processed: number;
};

type BackfillProductsResult = {
  alegra?: BackfillAlegraResult;
  shopify?: BackfillShopifyResult;
};

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function asBackfillProductsBody(value: unknown): BackfillProductsBody {
  return asRecord(value) as BackfillProductsBody;
}

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return fallback;
  if (lowered === "1" || lowered === "true" || lowered === "yes" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "no" || lowered === "off") return false;
  return fallback;
}

async function getAlegraConfigForStore(shopDomain?: string) {
  const normalized = shopDomain ? String(shopDomain).trim() : "";
  if (normalized) {
    const conn = await getAlegraConnectionByDomain(normalized);
    const baseUrl = getAlegraBaseUrl(conn.environment || "prod");
    const auth = Buffer.from(`${conn.email}:${conn.apiKey}`).toString("base64");
    return { baseUrl, auth };
  }
  const alegra = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  return { baseUrl, auth };
}

async function fetchAlegra(path: string, query?: URLSearchParams, shopDomain?: string) {
  const { baseUrl, auth } = await getAlegraConfigForStore(shopDomain);
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAlegraWithRetry(
  path: string,
  query: URLSearchParams | undefined,
  shopDomain: string | undefined,
  options: { maxRetries?: number; backoffBaseMs?: number } = {}
) {
  const maxRetries = options.maxRetries ?? 5;
  const backoffBaseMs = options.backoffBaseMs ?? 2000;
  let attempt = 0;
  while (true) {
    const response = await fetchAlegra(path, query, shopDomain);
    if (response.status !== 429) return response;
    if (attempt >= maxRetries) return response;
    await sleep(backoffBaseMs * Math.pow(2, attempt));
    attempt += 1;
  }
}

const extractCustomFieldValue = (item: AlegraItem, keys: string[]) => {
  if (!Array.isArray(item.customFields)) return "";
  const loweredKeys = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return loweredKeys.includes(name);
  });
  return String(match?.value || "").trim();
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
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

async function resolveBackfillProductsShopifyCredential(
  shopDomain?: string | null
): Promise<{ shopDomain: string; accessToken: string; apiVersion?: string }> {
  const normalized = typeof shopDomain === "string" ? shopDomain.trim() : "";
  if (!normalized) return getShopifyCredential();

  const connection = await getShopifyConnectionByDomain(normalized);
  if (connection) {
    return {
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    };
  }

  const legacyCredential = await getShopifyCredential();
  if (legacyCredential.shopDomain === normalized) {
    return legacyCredential;
  }

  throw new Error(`Shopify connection not found for ${normalized}`);
}

function getFirstVariantSku(product: ShopifyProduct) {
  const variants = product.variants?.edges || [];
  return variants[0]?.node?.sku || null;
}

export async function backfillProductsHandler(req: Request, res: Response) {
  try {
    const body = asBackfillProductsBody(req.body);
    const source = String(body.source || "both").toLowerCase();
    const limitRaw = Number(body.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;
    const dateStart = body.dateStart ? String(body.dateStart) : "";
    const dateEnd = body.dateEnd ? String(body.dateEnd) : "";
    const useCache = body.useCache === undefined ? true : parseBooleanLike(body.useCache, true);
    const alegraStatusInput = body.alegraStatus ? String(body.alegraStatus).trim() : "";
    const alegraStatusFilter = (
      alegraStatusInput ||
      (parseBooleanLike(body.alegraActiveOnly, false) ? "active" : "")
    ).toLowerCase();
    const shopifyPublishedOnly = parseBooleanLike(body.shopifyPublishedOnly, false);
    const results: BackfillProductsResult = {};

    if (source === "alegra" || source === "both") {
      let start = 0;
      const pageSize = 30;
      let processed = 0;
      let pages = 0;
      let usedCache = false;

      const cachedTotal = await countAlegraItemsCache();
      if (useCache && cachedTotal > 0) {
        usedCache = true;
        while (true) {
          if (limit !== null && processed >= limit) break;
          const batchLimit = limit !== null ? Math.min(pageSize, Math.max(0, limit - processed)) : pageSize;
          if (batchLimit <= 0) break;
          const cached = await listAlegraItemsCache({ start, limit: batchLimit });
          const batch = (cached.items as unknown as AlegraItem[]) || [];
          if (!batch.length) break;
          const filteredBatch = alegraStatusFilter
            ? batch.filter((item) => String(item?.status || "").toLowerCase() === alegraStatusFilter)
            : batch;
          if (filteredBatch.length) {
            await persistProductsFromAlegra(filteredBatch);
            processed += filteredBatch.length;
          }
          start += batch.length;
          pages += 1;
          if (batch.length < batchLimit) break;
        }
        results.alegra = { processed, pages, source: "cache", total: cachedTotal, status: alegraStatusFilter || null };
      }

      if (!usedCache) {
        start = 0;
        processed = 0;
        pages = 0;
        while (true) {
          if (limit !== null && processed >= limit) break;
          const batchLimit = limit !== null ? Math.min(pageSize, Math.max(0, limit - processed)) : pageSize;
          if (batchLimit <= 0) break;
          const query = new URLSearchParams();
          query.set("start", String(start));
          query.set("limit", String(batchLimit));
          query.set("mode", "advanced");
          query.set(
            "fields",
            "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,status,barcode,reference,code,created_at,createdAt,updated_at,updatedAt"
          );
          if (dateStart) query.set("updated_at_start", dateStart);
          const response = await fetchAlegraWithRetry("/items", query, undefined);
          if (!response.ok) break;
          const payload = (await response.json()) as { items?: AlegraItem[]; data?: AlegraItem[] };
          const batch = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
          if (!batch.length) break;
          const filteredBatch = alegraStatusFilter
            ? batch.filter((item) => String(item?.status || "").toLowerCase() === alegraStatusFilter)
            : batch;
          if (filteredBatch.length) {
            await persistProductsFromAlegra(filteredBatch);
            processed += filteredBatch.length;
          }
          start += batch.length;
          pages += 1;
          if (batch.length < batchLimit) break;
        }
        results.alegra = { processed, pages, source: "api", status: alegraStatusFilter || null };
      }
    }

    if (source === "shopify" || source === "both") {
      const shopDomainInput = typeof body.shopDomain === "string" ? body.shopDomain : "";
      const shopifyCredential = await resolveBackfillProductsShopifyCredential(shopDomainInput);
      const client = new ShopifyClient({
        shopDomain: shopifyCredential.shopDomain,
        accessToken: shopifyCredential.accessToken,
        apiVersion: resolveShopifyApiVersion(shopifyCredential.apiVersion),
      });
      const parts = shopifyPublishedOnly ? ["status:active", "published_status:published"] : ["status:any"];
      if (dateStart) parts.push(`updated_at:>='${dateStart}'`);
      if (dateEnd) parts.push(`updated_at:<='${dateEnd}'`);
      const query = parts.join(" ");
      const products = await client.listAllProductsByQuery(query, limit || undefined);
      let processed = 0;
      for (const product of products) {
        const sku = getFirstVariantSku(product);
        await upsertProduct({
          shopDomain: shopifyCredential.shopDomain,
          shopifyId: product.id,
          name: product.title || null,
          sku,
          reference: sku || null,
          statusShopify: product.status || null,
          sourceUpdatedAt: (product as { updatedAt?: string }).updatedAt || null,
          source: "shopify",
        });
        processed += 1;
      }
      results.shopify = { processed };
    }

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Backfill error" });
  }
}
