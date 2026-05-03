import { ShopifyClient, ShopifyProduct } from "../connectors/shopify";
import { AlegraClient } from "../connectors/alegra";
import { WooCommerceClient, WooProduct, WooVariation } from "../connectors/woocommerce";
import { getShopifyConnectionByDomain } from "./store-connections.service";
import { getWooConnectionByDomain } from "./woocommerce-connections.service";
import { getAlegraClient } from "./settings.service";

type CrossStoreProductsSyncSettings = {
  alegraAccountId?: number;
  priceListId?: string;
  priceFallback?: "shopify" | "none" | "skip";
  onlyActive?: boolean;
  status?: "draft" | "active";
  includeDescriptions?: boolean;
  includeImages?: boolean;
  includeTags?: boolean;
  includeProductType?: boolean;
  trackInventory?: boolean;
  allowOversell?: boolean;
  includeInventory?: boolean;
  inventorySource?: "accounting" | "commerce";
};

type CrossStoreProductsSyncParams = {
  sourceProvider: "shopify" | "woocommerce";
  targetProvider: "shopify" | "woocommerce";
  sourceShopDomain: string;
  targetShopDomain: string;
  settings?: CrossStoreProductsSyncSettings;
  onProgress?: (payload: {
    total: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }) => void;
  onStart?: (payload: { total: number }) => void;
};

type CrossStoreProductsSyncResult = {
  ok: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: Array<{ title?: string; message: string }>;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shouldRetryWoo = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("503") || message.toLowerCase().includes("service unavailable");
};
async function listWooVariationsWithRetry(client: WooCommerceClient, productId: number, retries = 2) {
  let attempt = 0;
  while (true) {
    try {
      return await client.listAllProductVariations(productId);
    } catch (error) {
      if (!shouldRetryWoo(error) || attempt >= retries) {
        throw error;
      }
      const waitMs = 800 * Math.pow(2, attempt);
      await wait(waitMs);
      attempt += 1;
    }
  }
}

async function listWooProductsWithRetry(
  client: WooCommerceClient,
  params: { status?: string; limit?: number },
  retries = 2
) {
  let attempt = 0;
  while (true) {
    try {
      return await client.listAllProducts(params);
    } catch (error) {
      if (!shouldRetryWoo(error) || attempt >= retries) {
        throw error;
      }
      const waitMs = 800 * Math.pow(2, attempt);
      await wait(waitMs);
      attempt += 1;
    }
  }
}

const normalizeDomain = (value: string) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const parsePriceValue = (value?: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizePriceListId = (value?: unknown) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
};

const resolvePriceListId = (price: Record<string, unknown>) => {
  const raw = price as { priceListId?: unknown; priceList?: { id?: unknown }; id?: unknown };
  return (
    normalizePriceListId(raw.priceListId) || normalizePriceListId(raw.priceList?.id) || normalizePriceListId(raw.id)
  );
};

const resolveAlegraInventoryQuantity = (inventory?: Record<string, unknown> | null) => {
  if (!inventory) return null;
  const warehouses = (inventory as { warehouses?: Array<{ availableQuantity?: unknown; quantity?: unknown }> })
    .warehouses;
  if (Array.isArray(warehouses) && warehouses.length) {
    return warehouses.reduce((total, entry) => {
      const raw = Number((entry?.availableQuantity ?? entry?.quantity ?? 0) as number);
      return total + (Number.isFinite(raw) ? raw : 0);
    }, 0);
  }
  const available = Number(
    (inventory as { availableQuantity?: unknown; quantity?: unknown }).availableQuantity ??
      (inventory as { availableQuantity?: unknown; quantity?: unknown }).quantity
  );
  return Number.isFinite(available) ? available : null;
};

async function loadAlegraInventoryByIdentifier(client: AlegraClient, identifier: string) {
  const base = await findAlegraItemByIdentifier(client, identifier);
  if (!base) return null;
  const id = String((base as { id?: string | number; _id?: string | number }).id || (base as any)._id || "");
  const inventoryPayload =
    id && id !== "undefined"
      ? ((await client.getItemWithParams(id, {
          fields: "inventory",
          metadata: true,
        })) as Record<string, unknown>)
      : (base as Record<string, unknown>);
  return resolveAlegraInventoryQuantity(
    (inventoryPayload as { inventory?: Record<string, unknown> }).inventory || null
  );
}

const resolveAlegraItemPrice = (item: Record<string, unknown>, listId?: string) => {
  if (!item) return null;
  const rawPrice = (item as { price?: unknown }).price;
  const normalizedListId = normalizePriceListId(listId);
  if (typeof rawPrice === "number" || typeof rawPrice === "string") {
    return parsePriceValue(rawPrice);
  }
  if (Array.isArray(rawPrice) && rawPrice.length) {
    if (normalizedListId) {
      const match = rawPrice.find((entry) => resolvePriceListId(entry || {}) === normalizedListId);
      const value = parsePriceValue((match as { price?: unknown })?.price);
      if (value !== null) return value;
    }
    const first = rawPrice[0];
    const fallback = parsePriceValue((first as { price?: unknown })?.price);
    return fallback;
  }
  return null;
};

const extractAlegraItems = (payload: Record<string, unknown>) => {
  const items = (payload as { items?: unknown }).items;
  if (Array.isArray(items)) return items as Record<string, unknown>[];
  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  return [];
};

async function findAlegraItemByIdentifier(client: AlegraClient, identifier: string) {
  const candidates = [
    { query: identifier },
    { reference: identifier },
    { barcode: identifier },
    { code: identifier },
    { name: identifier },
  ];
  for (const params of candidates) {
    const payload = (await client.searchItems({ ...params, limit: 1, metadata: true })) as Record<string, unknown>;
    const items = extractAlegraItems(payload);
    if (items.length) return items[0];
  }
  return null;
}

function resolveShopifyVariantIdentifiers(product: ShopifyProduct) {
  const identifiers: string[] = [];
  const edges = product?.variants?.edges || [];
  edges.forEach(({ node }) => {
    const sku = String(node?.sku || "").trim();
    const barcode = String(node?.barcode || "").trim();
    if (sku) identifiers.push(sku);
    if (barcode) identifiers.push(barcode);
  });
  return identifiers;
}

function resolveWooIdentifiers(product: WooProduct, variations: WooVariation[]) {
  const identifiers: string[] = [];
  const sku = String(product?.sku || "").trim();
  if (sku) identifiers.push(sku);
  variations.forEach((variation) => {
    const vsku = String(variation?.sku || "").trim();
    if (vsku) identifiers.push(vsku);
  });
  return identifiers;
}

function resolveWooProductImages(product: WooProduct) {
  return (product.images || []).map((image) => String(image?.src || "").trim()).filter((url) => url.length > 0);
}

function resolveShopifyProductImages(product: ShopifyProduct) {
  const edges = product?.images?.edges || [];
  return edges.map((edge) => String(edge?.node?.url || "").trim()).filter((url) => url.length > 0);
}

const coerceQuantity = (value?: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveWooStockQuantity = (product: WooProduct, variation?: WooVariation) => {
  if (variation) return coerceQuantity(variation.stock_quantity);
  return coerceQuantity(product.stock_quantity);
};

async function buildShopifyInputFromWoo(
  product: WooProduct,
  variations: WooVariation[],
  settings: CrossStoreProductsSyncSettings,
  alegra: AlegraClient
) {
  const includeDescriptions = settings.includeDescriptions !== false;
  const includeProductType = settings.includeProductType !== false;
  const includeTags = settings.includeTags !== false;
  const status: "ACTIVE" | "DRAFT" = settings.status === "active" ? "ACTIVE" : "DRAFT";
  const trackInventory = settings.trackInventory !== false;
  const allowOversell = settings.allowOversell === true;
  const priceListId = settings.priceListId;
  const priceFallback = settings.priceFallback || "shopify";

  const optionNames = (product.attributes || [])
    .filter((attr) => Boolean(attr?.variation))
    .map((attr) => String(attr?.name || "").trim())
    .filter(Boolean);

  const variants = [] as Array<{
    price?: string;
    sku?: string;
    barcode?: string;
    options?: string[];
    inventoryPolicy?: "CONTINUE" | "DENY" | null;
  }>;

  const sourceVariations = variations.length
    ? variations
    : [
        {
          id: product.id,
          sku: product.sku,
          price: product.price || product.regular_price,
          regular_price: product.regular_price,
          sale_price: product.sale_price,
          attributes: [],
        },
      ];

  for (const variation of sourceVariations) {
    const variant: {
      price?: string;
      sku?: string;
      barcode?: string;
      options?: string[];
      inventoryPolicy?: "CONTINUE" | "DENY" | null;
    } = {
      sku: variation?.sku ? String(variation.sku).trim() : undefined,
      inventoryPolicy: (allowOversell ? "CONTINUE" : "DENY") as "CONTINUE" | "DENY",
    };

    if (optionNames.length) {
      const selected = Array.isArray(variation?.attributes) ? variation.attributes : [];
      const optionValues = optionNames.map((name) => {
        const match = selected.find((entry) => entry?.name === name);
        if (match?.option) return String(match.option);
        return "Default";
      });
      variant.options = optionValues;
    }

    const identifier = String(variation?.sku || "").trim();
    if (identifier) {
      const alegraItem = await findAlegraItemByIdentifier(alegra, identifier);
      const price = resolveAlegraItemPrice(alegraItem || {}, priceListId);
      if (price === null) {
        if (priceFallback === "skip") {
          return null;
        }
        if (priceFallback === "none") {
          variant.price = "0";
        } else {
          const sourcePrice =
            variation?.regular_price || variation?.price || product?.regular_price || product?.price || "0";
          variant.price = String(sourcePrice).trim() || "0";
        }
      } else {
        variant.price = String(price);
      }
    } else {
      if (priceFallback === "skip") {
        return null;
      }
      if (priceFallback === "none") {
        variant.price = "0";
      } else {
        const sourcePrice =
          variation?.regular_price || variation?.price || product?.regular_price || product?.price || "0";
        variant.price = String(sourcePrice).trim() || "0";
      }
    }

    variants.push(variant);
  }

  if (!variants.length) {
    return null;
  }

  return {
    title: String(product.name || "").trim(),
    status,
    descriptionHtml: includeDescriptions ? String(product.description || "").trim() : undefined,
    productType: includeProductType ? String(product.categories?.[0]?.name || "").trim() || undefined : undefined,
    tags: includeTags ? (product.tags || []).map((tag) => String(tag?.name || "").trim()).filter(Boolean) : undefined,
    options: optionNames.length ? optionNames : undefined,
    variants,
    trackInventory,
  };
}

async function buildWooInputFromShopify(
  product: ShopifyProduct,
  settings: CrossStoreProductsSyncSettings,
  alegra: AlegraClient
) {
  const includeDescriptions = settings.includeDescriptions !== false;
  const includeProductType = settings.includeProductType !== false;
  const includeTags = settings.includeTags !== false;
  const status = settings.status === "active" ? "publish" : "draft";
  const includeInventory = settings.includeInventory !== false;
  const trackInventory = settings.trackInventory !== false;
  const inventorySource = settings.inventorySource === "commerce" ? "commerce" : "accounting";
  const allowOversell = settings.allowOversell === true;
  const priceListId = settings.priceListId;
  const priceFallback = settings.priceFallback || "shopify";

  const optionNames =
    Array.isArray(product.options) && product.options.length
      ? product.options.map((option) => String(option?.name || "").trim()).filter(Boolean)
      : [];

  const variants = [] as Array<{
    price?: string;
    sku?: string;
    attributes?: Array<{ name: string; option: string }>;
    stockQuantity?: number | null;
    backorders?: "yes" | "no";
  }>;

  for (const { node } of product?.variants?.edges || []) {
    const variant: {
      price?: string;
      sku?: string;
      attributes?: Array<{ name: string; option: string }>;
      stockQuantity?: number | null;
      backorders?: "yes" | "no";
    } = {
      sku: node?.sku ? String(node.sku).trim() : undefined,
    };

    if (optionNames.length) {
      const selected = Array.isArray(node?.selectedOptions) ? node.selectedOptions : [];
      const optionValues = optionNames.map((name) => {
        const match = selected.find((entry) => entry?.name === name);
        if (match?.value) return String(match.value);
        return "Default";
      });
      variant.attributes = optionNames.map((name, index) => ({
        name,
        option: optionValues[index] || "Default",
      }));
    }

    const identifier = String(node?.sku || node?.barcode || "").trim();
    if (identifier) {
      const alegraItem = await findAlegraItemByIdentifier(alegra, identifier);
      const price = resolveAlegraItemPrice(alegraItem || {}, priceListId);
      if (price === null) {
        if (priceFallback === "skip") {
          return null;
        }
        if (priceFallback === "none") {
          variant.price = "0";
        } else {
          variant.price = String(node?.price || "").trim() || "0";
        }
      } else {
        variant.price = String(price);
      }
    } else {
      if (priceFallback === "skip") {
        return null;
      }
      if (priceFallback === "none") {
        variant.price = "0";
      } else {
        variant.price = String(node?.price || "").trim() || "0";
      }
    }

    if (includeInventory && trackInventory) {
      if (inventorySource === "commerce") {
        const raw = Number(node?.inventoryQuantity ?? 0);
        variant.stockQuantity = Number.isFinite(raw) ? raw : null;
      } else {
        variant.stockQuantity = await loadAlegraInventoryByIdentifier(alegra, identifier);
      }
    }
    if (trackInventory) {
      variant.backorders = allowOversell ? "yes" : "no";
    }

    variants.push(variant);
  }

  if (!variants.length) {
    return null;
  }

  const isVariable = optionNames.length > 0 || variants.length > 1;
  const base: Record<string, unknown> = {
    name: String(product.title || "").trim(),
    status,
    description: includeDescriptions ? String(product.descriptionHtml || "").trim() : undefined,
    type: isVariable ? "variable" : "simple",
    tags: includeTags && Array.isArray(product.tags) ? product.tags.map((tag) => ({ name: tag })) : undefined,
    categories: includeProductType && product.productType ? [{ name: product.productType }] : undefined,
  };

  if (!isVariable) {
    const single = variants[0];
    return {
      ...base,
      sku: single?.sku,
      regular_price: single?.price,
      manage_stock: includeInventory && trackInventory ? true : undefined,
      backorders: includeInventory && trackInventory ? (allowOversell ? "yes" : "no") : undefined,
      stock_quantity:
        includeInventory && trackInventory && Number.isFinite(single?.stockQuantity as number)
          ? Math.max(0, Math.trunc(single?.stockQuantity as number))
          : undefined,
    };
  }

  const attributes = optionNames.map((name, index) => {
    const values = new Set<string>();
    variants.forEach((variant) => {
      const value = variant.attributes?.[index]?.option;
      if (value) values.add(value);
    });
    return {
      name,
      variation: true,
      visible: true,
      options: Array.from(values),
    };
  });

  return {
    ...base,
    attributes,
    _variations: variants,
  };
}

async function buildWooInputFromWoo(
  product: WooProduct,
  variations: WooVariation[],
  settings: CrossStoreProductsSyncSettings,
  alegra: AlegraClient
) {
  const includeDescriptions = settings.includeDescriptions !== false;
  const includeProductType = settings.includeProductType !== false;
  const includeTags = settings.includeTags !== false;
  const status = settings.status === "active" ? "publish" : "draft";
  const includeInventory = settings.includeInventory !== false;
  const trackInventory = settings.trackInventory !== false;
  const inventorySource = settings.inventorySource === "commerce" ? "commerce" : "accounting";
  const allowOversell = settings.allowOversell === true;
  const priceListId = settings.priceListId;
  const priceFallback = settings.priceFallback || "shopify";

  const optionNames = (product.attributes || [])
    .filter((attr) => Boolean(attr?.variation))
    .map((attr) => String(attr?.name || "").trim())
    .filter(Boolean);

  const sourceVariations = variations.length
    ? variations
    : [
        {
          id: product.id,
          sku: product.sku,
          price: product.price || product.regular_price,
          regular_price: product.regular_price,
          sale_price: product.sale_price,
          attributes: [],
          stock_quantity: product.stock_quantity,
        },
      ];

  const variants = [] as Array<{
    price?: string;
    sku?: string;
    attributes?: Array<{ name: string; option: string }>;
    stockQuantity?: number | null;
    backorders?: "yes" | "no";
  }>;

  for (const variation of sourceVariations) {
    const variant: {
      price?: string;
      sku?: string;
      attributes?: Array<{ name: string; option: string }>;
      stockQuantity?: number | null;
      backorders?: "yes" | "no";
    } = {
      sku: variation?.sku ? String(variation.sku).trim() : undefined,
    };

    if (optionNames.length) {
      const selected = Array.isArray(variation?.attributes) ? variation.attributes : [];
      const optionValues = optionNames.map((name) => {
        const match = selected.find((entry) => entry?.name === name);
        if (match?.option) return String(match.option);
        return "Default";
      });
      variant.attributes = optionNames.map((name, index) => ({
        name,
        option: optionValues[index] || "Default",
      }));
    }

    const identifier = String(variation?.sku || "").trim();
    if (identifier) {
      const alegraItem = await findAlegraItemByIdentifier(alegra, identifier);
      const price = resolveAlegraItemPrice(alegraItem || {}, priceListId);
      if (price === null) {
        if (priceFallback === "skip") {
          return null;
        }
        if (priceFallback === "none") {
          variant.price = "0";
        } else {
          const sourcePrice =
            variation?.regular_price || variation?.price || product?.regular_price || product?.price || "0";
          variant.price = String(sourcePrice).trim() || "0";
        }
      } else {
        variant.price = String(price);
      }
    } else {
      if (priceFallback === "skip") {
        return null;
      }
      if (priceFallback === "none") {
        variant.price = "0";
      } else {
        const sourcePrice =
          variation?.regular_price || variation?.price || product?.regular_price || product?.price || "0";
        variant.price = String(sourcePrice).trim() || "0";
      }
    }

    if (includeInventory && trackInventory) {
      if (inventorySource === "commerce") {
        variant.stockQuantity = resolveWooStockQuantity(product, variation);
      } else if (identifier) {
        variant.stockQuantity = await loadAlegraInventoryByIdentifier(alegra, identifier);
      }
    }
    if (trackInventory) {
      variant.backorders = allowOversell ? "yes" : "no";
    }

    variants.push(variant);
  }

  if (!variants.length) {
    return null;
  }

  const isVariable = optionNames.length > 0 || variants.length > 1;
  const base: Record<string, unknown> = {
    name: String(product.name || "").trim(),
    status,
    description: includeDescriptions ? String(product.description || "").trim() : undefined,
    type: isVariable ? "variable" : "simple",
    tags: includeTags ? (product.tags || []).map((tag) => ({ name: String(tag?.name || "").trim() })) : undefined,
    categories: includeProductType
      ? (product.categories || []).map((cat) => ({ name: String(cat?.name || "").trim() }))
      : undefined,
  };

  if (!isVariable) {
    const single = variants[0];
    return {
      ...base,
      sku: single?.sku,
      regular_price: single?.price,
      manage_stock: includeInventory && trackInventory ? true : undefined,
      backorders: includeInventory && trackInventory ? (allowOversell ? "yes" : "no") : undefined,
      stock_quantity:
        includeInventory && trackInventory && Number.isFinite(single?.stockQuantity as number)
          ? Math.max(0, Math.trunc(single?.stockQuantity as number))
          : undefined,
    };
  }

  const attributes = optionNames.map((name, index) => {
    const values = new Set<string>();
    variants.forEach((variant) => {
      const value = variant.attributes?.[index]?.option;
      if (value) values.add(value);
    });
    return {
      name,
      variation: true,
      visible: true,
      options: Array.from(values),
    };
  });

  return {
    ...base,
    attributes,
    _variations: variants,
  };
}

export async function syncProductsAcrossProviders(
  params: CrossStoreProductsSyncParams
): Promise<CrossStoreProductsSyncResult> {
  const sourceDomain = normalizeDomain(params.sourceShopDomain || "");
  const targetDomain = normalizeDomain(params.targetShopDomain || "");

  if (!sourceDomain || !targetDomain) {
    throw new Error("Dominio origen y destino requeridos.");
  }
  if (sourceDomain === targetDomain && params.sourceProvider === params.targetProvider) {
    throw new Error("La tienda origen y destino deben ser diferentes.");
  }

  const settings: CrossStoreProductsSyncSettings = params.settings || {};
  const includeInventory = settings.includeInventory !== false;
  const trackInventory = settings.trackInventory !== false;
  const inventorySource = settings.inventorySource === "commerce" ? "commerce" : "accounting";
  const alegraAccountId = Number(settings.alegraAccountId || 0);
  if (!Number.isFinite(alegraAccountId) || alegraAccountId <= 0) {
    throw new Error("Cuenta Alegra requerida.");
  }
  const priceListId = String(settings.priceListId || "").trim();
  if (!priceListId) {
    throw new Error("Lista de precios requerida.");
  }

  const alegraClient = await getAlegraClient(alegraAccountId);

  let sourceProducts: Array<{
    product: ShopifyProduct | WooProduct;
    variations?: WooVariation[];
    variationError?: string;
  }>;

  if (params.sourceProvider === "shopify") {
    const sourceConnection = await getShopifyConnectionByDomain(sourceDomain);
    const sourceClient = new ShopifyClient({
      shopDomain: sourceConnection.shopDomain,
      accessToken: sourceConnection.accessToken,
    });
    const onlyActive = settings.onlyActive !== false;
    const query = onlyActive ? "status:active" : "status:any";
    const products = await sourceClient.listAllProductsByQuery(query);
    sourceProducts = products.map((product) => ({ product }));
  } else {
    const sourceConnection = await getWooConnectionByDomain(sourceDomain);
    const sourceClient = new WooCommerceClient({
      shopDomain: sourceConnection.shopDomain,
      consumerKey: sourceConnection.consumerKey,
      consumerSecret: sourceConnection.consumerSecret,
    });
    const onlyActive = settings.onlyActive !== false;
    const status = onlyActive ? "publish" : undefined;
    const products = await listWooProductsWithRetry(sourceClient, { status });
    const enriched = [] as Array<{ product: WooProduct; variations?: WooVariation[]; variationError?: string }>;
    for (const product of products) {
      if (product.type === "variable") {
        try {
          const variations = await listWooVariationsWithRetry(sourceClient, product.id);
          enriched.push({ product, variations });
        } catch (error) {
          enriched.push({
            product,
            variations: [],
            variationError: error instanceof Error ? error.message : "Error cargando variaciones",
          });
        }
      } else {
        enriched.push({ product, variations: [] });
      }
    }
    sourceProducts = enriched;
  }

  const result: CrossStoreProductsSyncResult = {
    ok: true,
    total: sourceProducts.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  params.onStart?.({ total: result.total });

  let targetShopify: ShopifyClient | null = null;
  let targetWoo: WooCommerceClient | null = null;

  if (params.targetProvider === "shopify") {
    const targetConnection = await getShopifyConnectionByDomain(targetDomain);
    targetShopify = new ShopifyClient({
      shopDomain: targetConnection.shopDomain,
      accessToken: targetConnection.accessToken,
    });
  } else {
    const targetConnection = await getWooConnectionByDomain(targetDomain);
    targetWoo = new WooCommerceClient({
      shopDomain: targetConnection.shopDomain,
      consumerKey: targetConnection.consumerKey,
      consumerSecret: targetConnection.consumerSecret,
    });
  }
  const targetLocationId =
    targetShopify && includeInventory && trackInventory ? await targetShopify.getPrimaryLocationId() : "";

  let processed = 0;
  for (const entry of sourceProducts) {
    try {
      if (entry.variationError) {
        result.failed += 1;
        const title =
          params.sourceProvider === "shopify"
            ? (entry.product as ShopifyProduct)?.title
            : (entry.product as WooProduct)?.name;
        result.errors?.push({
          title: title || undefined,
          message: entry.variationError,
        });
        processed += 1;
        params.onProgress?.({
          total: result.total,
          processed,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          failed: result.failed,
        });
        continue;
      }
      if (params.sourceProvider === "shopify") {
        const product = entry.product as ShopifyProduct;
        const identifiers = resolveShopifyVariantIdentifiers(product);
        if (!identifiers.length) {
          result.skipped += 1;
          result.errors?.push({
            title: String(product?.title || "").trim() || undefined,
            message: "SKU o barcode requerido para sincronizar producto de Shopify.",
          });
          continue;
        }
        let exists = false;
        let wooMatch: WooProduct | null = null;
        if (params.targetProvider === "shopify" && targetShopify) {
          for (const identifier of identifiers) {
            const match = await targetShopify.findVariantByIdentifier(identifier);
            const edges = match?.productVariants?.edges || [];
            if (edges.length) {
              exists = true;
              break;
            }
          }
        }
        if (params.targetProvider === "woocommerce" && targetWoo) {
          for (const identifier of identifiers) {
            const matches = await targetWoo.findProductsBySku(identifier);
            if (matches.length) {
              exists = true;
              wooMatch = matches[0];
              break;
            }
          }
        }
        if (params.targetProvider === "woocommerce" && targetWoo) {
          const input = await buildWooInputFromShopify(product, settings, alegraClient);
          if (!input) {
            result.skipped += 1;
            continue;
          }
          const images = settings.includeImages !== false ? resolveShopifyProductImages(product) : [];
          if (images.length && typeof input === "object") {
            (input as Record<string, unknown>).images = images.map((src) => ({ src }));
          }
          const rawPayload = input as Record<string, unknown>;
          const variationsPayload = rawPayload._variations as
            | Array<{
                sku?: string;
                price?: string;
                attributes?: Array<{ name: string; option: string }>;
                stockQuantity?: number | null;
              }>
            | undefined;
          if (rawPayload._variations) {
            delete rawPayload._variations;
          }
          if (exists && wooMatch) {
            await targetWoo.updateProduct(wooMatch.id, rawPayload);
            if (variationsPayload) {
              const existing = await targetWoo.listAllProductVariations(wooMatch.id);
              for (const variation of variationsPayload) {
                const match = existing.find((item) => String(item.sku || "") === String(variation.sku || ""));
                const payload: Record<string, unknown> = {
                  sku: variation.sku,
                  regular_price: variation.price,
                  attributes: variation.attributes,
                  manage_stock: settings.includeInventory !== false && settings.trackInventory !== false,
                  backorders:
                    settings.includeInventory !== false && settings.trackInventory !== false
                      ? settings.allowOversell === true
                        ? "yes"
                        : "no"
                      : undefined,
                  stock_quantity:
                    settings.includeInventory !== false &&
                    settings.trackInventory !== false &&
                    Number.isFinite(variation.stockQuantity as number)
                      ? Math.max(0, Math.trunc(variation.stockQuantity as number))
                      : undefined,
                };
                if (match?.id) {
                  await targetWoo.updateVariation(wooMatch.id, match.id, payload);
                } else {
                  await targetWoo.createVariation(wooMatch.id, payload);
                }
              }
            }
            result.updated += 1;
          } else {
            const created = await targetWoo.createProduct(rawPayload);
            if (variationsPayload && created?.id) {
              const variations = variationsPayload;
              for (const variation of variations) {
                await targetWoo.createVariation(created.id, {
                  sku: variation.sku,
                  regular_price: variation.price,
                  attributes: variation.attributes,
                  manage_stock: settings.includeInventory !== false && settings.trackInventory !== false,
                  backorders:
                    settings.includeInventory !== false && settings.trackInventory !== false
                      ? settings.allowOversell === true
                        ? "yes"
                        : "no"
                      : undefined,
                  stock_quantity:
                    settings.includeInventory !== false &&
                    settings.trackInventory !== false &&
                    Number.isFinite(variation.stockQuantity as number)
                      ? Math.max(0, Math.trunc(variation.stockQuantity as number))
                      : undefined,
                });
              }
            }
            result.created += 1;
          }
          await delay(150);
          continue;
        }
        if (exists) {
          result.skipped += 1;
          continue;
        }
      } else {
        const product = entry.product as WooProduct;
        const variations = entry.variations || [];
        const identifiers = resolveWooIdentifiers(product, variations);
        if (!identifiers.length) {
          result.skipped += 1;
          result.errors?.push({
            title: String(product?.name || "").trim() || undefined,
            message: "SKU requerido para sincronizar producto de WooCommerce.",
          });
          continue;
        }
        let exists = false;
        let wooMatch: WooProduct | null = null;
        if (params.targetProvider === "shopify" && targetShopify) {
          for (const identifier of identifiers) {
            const match = await targetShopify.findVariantByIdentifier(identifier);
            const edges = match?.productVariants?.edges || [];
            if (edges.length) {
              exists = true;
              break;
            }
          }
        }
        if (params.targetProvider === "woocommerce" && targetWoo) {
          for (const identifier of identifiers) {
            const matches = await targetWoo.findProductsBySku(identifier);
            if (matches.length) {
              exists = true;
              wooMatch = matches[0];
              break;
            }
          }
        }
        if (params.targetProvider === "woocommerce" && targetWoo) {
          const input = await buildWooInputFromWoo(product, variations, settings, alegraClient);
          if (!input) {
            result.skipped += 1;
            continue;
          }
          const images = settings.includeImages !== false ? resolveWooProductImages(product) : [];
          if (images.length && typeof input === "object") {
            (input as Record<string, unknown>).images = images.map((src) => ({ src }));
          }
          const rawPayload = input as Record<string, unknown>;
          const variationsPayload = rawPayload._variations as
            | Array<{
                sku?: string;
                price?: string;
                attributes?: Array<{ name: string; option: string }>;
                stockQuantity?: number | null;
              }>
            | undefined;
          if (rawPayload._variations) {
            delete rawPayload._variations;
          }
          if (exists && wooMatch) {
            await targetWoo.updateProduct(wooMatch.id, rawPayload);
            if (variationsPayload) {
              const existing = await targetWoo.listAllProductVariations(wooMatch.id);
              for (const variation of variationsPayload) {
                const match = existing.find((item) => String(item.sku || "") === String(variation.sku || ""));
                const payload: Record<string, unknown> = {
                  sku: variation.sku,
                  regular_price: variation.price,
                  attributes: variation.attributes,
                  manage_stock: settings.includeInventory !== false && settings.trackInventory !== false,
                  backorders:
                    settings.includeInventory !== false && settings.trackInventory !== false
                      ? settings.allowOversell === true
                        ? "yes"
                        : "no"
                      : undefined,
                  stock_quantity:
                    settings.includeInventory !== false &&
                    settings.trackInventory !== false &&
                    Number.isFinite(variation.stockQuantity as number)
                      ? Math.max(0, Math.trunc(variation.stockQuantity as number))
                      : undefined,
                };
                if (match?.id) {
                  await targetWoo.updateVariation(wooMatch.id, match.id, payload);
                } else {
                  await targetWoo.createVariation(wooMatch.id, payload);
                }
              }
            }
            result.updated += 1;
          } else {
            const created = await targetWoo.createProduct(rawPayload);
            if (variationsPayload && created?.id) {
              const variationsList = variationsPayload;
              for (const variation of variationsList) {
                await targetWoo.createVariation(created.id, {
                  sku: variation.sku,
                  regular_price: variation.price,
                  attributes: variation.attributes,
                  manage_stock: settings.includeInventory !== false && settings.trackInventory !== false,
                  backorders:
                    settings.includeInventory !== false && settings.trackInventory !== false
                      ? settings.allowOversell === true
                        ? "yes"
                        : "no"
                      : undefined,
                  stock_quantity:
                    settings.includeInventory !== false &&
                    settings.trackInventory !== false &&
                    Number.isFinite(variation.stockQuantity as number)
                      ? Math.max(0, Math.trunc(variation.stockQuantity as number))
                      : undefined,
                });
              }
            }
            result.created += 1;
          }
          await delay(150);
          continue;
        }
        if (exists) {
          result.skipped += 1;
          continue;
        }

        if (params.targetProvider === "shopify" && targetShopify) {
          const input = await buildShopifyInputFromWoo(product, variations, settings, alegraClient);
          if (!input) {
            result.skipped += 1;
            continue;
          }
          const created = await targetShopify.createProduct(input);
          const productId = (created as { product?: { id?: string } })?.product?.id || "";
          if (settings.includeImages !== false && productId) {
            const images = resolveWooProductImages(product);
            if (images.length) {
              await targetShopify.addProductImagesByUrl(productId, images);
            }
          }
          if (includeInventory && trackInventory && targetLocationId) {
            const inventoryPairs: Array<{ identifier: string; quantity: number }> = [];
            if (variations.length) {
              for (const variation of variations) {
                const identifier = String(variation?.sku || "").trim();
                if (!identifier) continue;
                let quantity: number | null = null;
                if (inventorySource === "commerce") {
                  quantity = resolveWooStockQuantity(product, variation);
                } else {
                  quantity = await loadAlegraInventoryByIdentifier(alegraClient, identifier);
                }
                if (!Number.isFinite(quantity as number)) continue;
                inventoryPairs.push({ identifier, quantity: quantity as number });
              }
            } else {
              const identifier = String(product?.sku || "").trim();
              if (identifier) {
                let quantity: number | null = null;
                if (inventorySource === "commerce") {
                  quantity = resolveWooStockQuantity(product);
                } else {
                  quantity = await loadAlegraInventoryByIdentifier(alegraClient, identifier);
                }
                if (Number.isFinite(quantity as number)) {
                  inventoryPairs.push({ identifier, quantity: quantity as number });
                }
              }
            }
            for (const pair of inventoryPairs) {
              const match = await targetShopify.findVariantByIdentifier(pair.identifier);
              const edge = match?.productVariants?.edges?.[0];
              const inventoryItemId = edge?.node?.inventoryItem?.id || "";
              if (!inventoryItemId) continue;
              await targetShopify.setInventoryOnHand(
                inventoryItemId,
                targetLocationId,
                Math.max(0, Math.trunc(pair.quantity))
              );
            }
          }
          result.created += 1;
          await delay(150);
        }
      }
    } catch (error) {
      result.failed += 1;
      const title =
        params.sourceProvider === "shopify"
          ? (entry.product as ShopifyProduct)?.title
          : (entry.product as WooProduct)?.name;
      result.errors?.push({
        title: title || undefined,
        message: error instanceof Error ? error.message : "Error copiando producto",
      });
    }
    processed += 1;
    params.onProgress?.({
      total: result.total,
      processed,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    });
  }

  if (!result.errors?.length) {
    delete result.errors;
  }

  return result;
}
