import type { Request, Response } from "express";

import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";
import { resolveStoreConfig } from "../../../../../../src/services/store-config.service";
import { getStoreConfigForDomain } from "../../../../../../src/services/store-configs.service";
import { getAlegraConnectionByDomain, getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { upsertProduct } from "../../../../../../src/services/products.service";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../../../../../../src/db";

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

type ProductsSyncSettings = {
  trackInventory?: unknown;
  status?: unknown;
  allowOversell?: unknown;
  onlyActive?: unknown;
  includeImages?: unknown;
  vendor?: unknown;
};

type ShopifyConfig = {
  shopDomain: string;
  baseAdmin: string;
  accessToken: string;
  apiVersion: string;
  vendorDefault: string;
  locationId: string;
};

type ShopifyProductCreateResponse = {
  product?: {
    id?: string | number;
  };
} & JsonObject;

type PriceListConfig = {
  generalId?: string;
  discountId?: string;
  wholesaleId?: string;
  currency?: string;
};

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
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

function asProductsSyncSettings(value: unknown): ProductsSyncSettings {
  return asRecord(value) as ProductsSyncSettings;
}

function resolveShopifyPublishSettings(settings: ProductsSyncSettings) {
  return {
    status: typeof settings.status === "string" && settings.status.trim() ? settings.status : "draft",
    includeImages: parseBooleanLike(settings.includeImages, true),
    vendor: typeof settings.vendor === "string" ? settings.vendor : "",
    allowOversell: parseBooleanLike(settings.allowOversell, false),
  };
}

function asShopifyProductCreateResponse(value: unknown): ShopifyProductCreateResponse {
  return asRecord(value) as ShopifyProductCreateResponse;
}

function getShopifyProductId(value: unknown): string {
  const response = asShopifyProductCreateResponse(value);
  const rawId = response.product?.id;
  if (typeof rawId === "string" && rawId.trim()) return rawId;
  if (typeof rawId === "number" && Number.isFinite(rawId)) return String(rawId);
  return "";
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

const shouldSyncByWarehouse = (
  inventory: AlegraItem["inventory"] | AlegraVariant["inventory"] | undefined,
  warehouseIds: string[]
) => {
  if (!warehouseIds.length) return true;
  const warehouses = Array.isArray(inventory?.warehouses) ? inventory.warehouses : [];
  if (!warehouses.length) return true;
  return warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)));
};

const normalizePriceId = (value?: string | number) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const resolvePriceListId = (price?: AlegraPrice) => {
  if (!price) return "";
  return normalizePriceId(price.priceListId) || normalizePriceId(price.priceList?.id) || normalizePriceId(price.id);
};

const parsePriceValue = (value?: string | number) => {
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
  const match = prices.find((price) => {
    const name = String(price?.name || "").toLowerCase();
    const type = String(price?.type || "").toLowerCase();
    return keywords.some((keyword) => name.includes(keyword) || type.includes(keyword));
  });
  return match || null;
};

const pickPriceForStore = (prices: AlegraPrice[] = [], config?: PriceListConfig) => {
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
  return parsePriceValue(fallback?.price);
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
  return Number(inventory.quantity ?? inventory.availableQuantity ?? 0) || 0;
};

const buildShopifyPayload = (
  alegraItem: AlegraItem,
  settings: { status?: string; includeImages?: boolean; vendor?: string; allowOversell?: boolean },
  warehouseIds: string[],
  includeInventory: boolean,
  priceConfig?: PriceListConfig,
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
    price: pickPriceForStore(alegraItem.price, priceConfig)?.toString() ?? "0",
    inventory_policy: inventoryPolicy,
    inventory_management: inventoryManagement,
    inventory_quantity:
      includeInventory && trackInventory ? resolveInventoryQuantity(alegraItem.inventory, warehouseIds) : 0,
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
          price: pickPriceForStore(variant.price, priceConfig)?.toString() ?? "0",
          inventory_policy: inventoryPolicy,
          inventory_management: inventoryManagement,
          inventory_quantity:
            includeInventory && trackInventory ? resolveInventoryQuantity(variant.inventory, warehouseIds) : 0,
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

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

async function getShopifyConfig(shopDomain?: string): Promise<ShopifyConfig> {
  const normalize = (value: string) =>
    value
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
  const normalized = shopDomain ? normalize(String(shopDomain)) : "";
  const connection = normalized ? await getShopifyConnectionByDomain(normalized) : null;
  const shopify = connection ? null : await getShopifyCredential();
  const rawDomain = connection?.shopDomain || shopify?.shopDomain || "";
  const cleanedDomain = normalize(rawDomain);
  return {
    shopDomain: cleanedDomain,
    baseAdmin: `https://${cleanedDomain}/admin`,
    accessToken: connection?.accessToken || shopify?.accessToken || "",
    apiVersion: resolveShopifyApiVersion(shopify?.apiVersion),
    vendorDefault: process.env.SHOPIFY_VENDOR || "",
    locationId: shopify?.locationId || "",
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

export async function publishShopifyHandler(req: Request, res: Response) {
  const { alegraId, settings = {}, alegraItem, shopDomain } = req.body || {};
  try {
    const publishSettings = asProductsSyncSettings(settings);
    const publishPayloadSettings = resolveShopifyPublishSettings(publishSettings);
    const shopifyConfig = await getShopifyConfig(shopDomain ? String(shopDomain) : "");
    const storeDomain = shopifyConfig.shopDomain;
    const storeConfig = storeDomain ? await resolveStoreConfig(storeDomain) : await resolveStoreConfig(null);
    let item: AlegraItem | undefined = alegraItem;
    if (!item && alegraId) {
      const query = new URLSearchParams();
      query.set("mode", "advanced");
      query.set(
        "fields",
        "variantAttributes,itemVariants,inventory,images,variantParent_id,variantParentId,idItemParent,customFields,barcode,reference,code"
      );
      const response = await fetchAlegra(`/items/${alegraId}`, query, storeDomain || undefined);
      if (!response.ok) {
        throw new Error(`Alegra HTTP ${response.status}`);
      }
      item = (await response.json()) as AlegraItem;
    }
    if (!item) {
      res.status(400).json({ error: "alegraId o alegraItem requerido" });
      return;
    }
    const onlyActive = parseBooleanLike(publishSettings.onlyActive, false);
    if (onlyActive) {
      const statusValue = String(item.status || "").toLowerCase();
      if (statusValue === "inactive") {
        res
          .status(400)
          .json({ error: "Producto inactivo en Alegra. (Desactiva 'Solo activos en Alegra' si quieres forzarlo.)" });
        return;
      }
    }
    const storeConfigFull = storeDomain ? await getStoreConfigForDomain(storeDomain) : null;
    const warehouseIds =
      storeConfigFull?.rules?.warehouseIds && storeConfigFull.rules.warehouseIds.length
        ? storeConfigFull.rules.warehouseIds
        : await loadWarehouseIdsForSync();
    if (!shouldSyncByWarehouse(item.inventory, warehouseIds)) {
      res.status(400).json({ error: "Producto fuera de las bodegas seleccionadas." });
      return;
    }
    const trackInventory = parseBooleanLike(publishSettings.trackInventory, true);
    const payload = buildShopifyPayload(
      item,
      publishPayloadSettings,
      warehouseIds,
      true,
      {
        generalId: storeConfig?.priceListGeneralId,
        discountId: storeConfig?.priceListDiscountId,
        wholesaleId: storeConfig?.priceListWholesaleId,
        currency: storeConfig?.currency,
      },
      trackInventory
    );
    const published = await fetchShopify(
      "/products.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      shopifyConfig
    );
    const shopifyProductId = getShopifyProductId(published);
    const sourceUpdatedAt = resolveItemDate(item);
    await upsertProduct({
      shopDomain: storeDomain,
      alegraId: item.id,
      shopifyId: shopifyProductId,
      name: item.name || null,
      reference: normalizeText(item.reference || item.code || item.barcode),
      sku: resolveItemSku(item),
      statusAlegra: item.status || null,
      statusShopify: typeof settings?.status === "string" ? settings.status : "draft",
      inventoryQuantity: resolveItemQuantityForFilter(item, []),
      sourceUpdatedAt: sourceUpdatedAt !== null ? new Date(sourceUpdatedAt) : null,
      source: "alegra",
      payloadJson: item,
    });
    res.json({ ok: true, shopify: published });
    await safeCreateLog({
      entity: "shopify_publish",
      direction: "alegra->shopify",
      status: "success",
      message: "Producto publicado",
      request: { alegraId, settings, shopDomain: storeDomain || null },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Shopify publish error" });
    await safeCreateLog({
      entity: "shopify_publish",
      direction: "alegra->shopify",
      status: "fail",
      message: error instanceof Error ? error.message : "Shopify publish error",
      request: { alegraId, settings, shopDomain: shopDomain || null },
    });
  }
}
