import { ShopifyClient, ShopifyProduct } from "../connectors/shopify";
import { AlegraClient } from "../connectors/alegra";
import { getShopifyConnectionByDomain } from "./store-connections.service";
import { getAlegraClient } from "./settings.service";

type ShopifyStoreProductsSyncSettings = {
  alegraAccountId?: number;
  priceListId?: string;
  priceFallback?: "shopify" | "none" | "skip";
  onlyActive?: boolean;
  status?: "draft" | "active";
  includeDescriptions?: boolean;
  includeImages?: boolean;
  includeTags?: boolean;
  includeProductType?: boolean;
};

type ShopifyStoreProductsSyncParams = {
  sourceShopDomain: string;
  targetShopDomain: string;
  settings?: ShopifyStoreProductsSyncSettings;
};

type ShopifyStoreProductsSyncResult = {
  ok: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors?: Array<{ title?: string; message: string }>;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDomain = (value: string) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

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

const normalizePriceListId = (value?: string | number | null) =>
  value === undefined || value === null ? "" : String(value).trim();

const resolvePriceListId = (price: Record<string, unknown>) =>
  normalizePriceListId((price as { priceListId?: unknown }).priceListId) ||
  normalizePriceListId((price as { priceList?: { id?: unknown } }).priceList?.id) ||
  normalizePriceListId((price as { id?: unknown }).id);

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
    const payload = (await client.searchItems({ ...params, limit: 1, metadata: true })) as Record<
      string,
      unknown
    >;
    const items = extractAlegraItems(payload);
    if (items.length) return items[0];
  }
  return null;
}

function resolveVariantIdentifiers(product: ShopifyProduct) {
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

async function buildProductCreateInput(
  product: ShopifyProduct,
  settings: ShopifyStoreProductsSyncSettings,
  alegra: AlegraClient
) {
  const includeDescriptions = settings.includeDescriptions !== false;
  const includeProductType = settings.includeProductType !== false;
  const includeTags = settings.includeTags !== false;
  const status = settings.status === "active" ? "ACTIVE" : "DRAFT";
  const priceListId = settings.priceListId;
  const priceFallback = settings.priceFallback || "shopify";

  const optionNames =
    Array.isArray(product.options) && product.options.length
      ? product.options.map((option) => String(option?.name || "").trim()).filter(Boolean)
      : [];

  const variants = [];
  for (const { node } of product?.variants?.edges || []) {
    const variant: {
      price?: string;
      sku?: string;
      barcode?: string;
      options?: string[];
    } = {
      sku: node?.sku ? String(node.sku).trim() : undefined,
      barcode: node?.barcode ? String(node.barcode).trim() : undefined,
    };

    if (optionNames.length) {
      const selected = Array.isArray(node?.selectedOptions) ? node.selectedOptions : [];
      const optionValues = optionNames.map((name) => {
        const match = selected.find((entry) => entry?.name === name);
        if (match?.value) return String(match.value);
        return "Default";
      });
      variant.options = optionValues;
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

    variants.push(variant);
  }

  if (!variants.length) {
    return null;
  }

  return {
    title: String(product.title || "").trim(),
    status,
    descriptionHtml: includeDescriptions ? String(product.descriptionHtml || "").trim() : undefined,
    vendor: product.vendor ? String(product.vendor).trim() : undefined,
    productType: includeProductType ? String(product.productType || "").trim() : undefined,
    tags: includeTags && Array.isArray(product.tags) ? product.tags : undefined,
    options: optionNames.length ? optionNames : undefined,
    variants,
  };
}

function resolveProductImages(product: ShopifyProduct) {
  const edges = product?.images?.edges || [];
  return edges
    .map((edge) => String(edge?.node?.url || "").trim())
    .filter((url) => url.length > 0);
}

export async function syncShopifyProductsBetweenStores(
  params: ShopifyStoreProductsSyncParams
): Promise<ShopifyStoreProductsSyncResult> {
  const sourceDomain = normalizeDomain(params.sourceShopDomain || "");
  const targetDomain = normalizeDomain(params.targetShopDomain || "");

  if (!sourceDomain || !targetDomain) {
    throw new Error("Dominio origen y destino requeridos.");
  }
  if (sourceDomain === targetDomain) {
    throw new Error("La tienda origen y destino deben ser diferentes.");
  }

  const sourceConnection = await getShopifyConnectionByDomain(sourceDomain);
  const targetConnection = await getShopifyConnectionByDomain(targetDomain);
  const alegraAccountId = Number(settings.alegraAccountId || 0);
  if (!Number.isFinite(alegraAccountId) || alegraAccountId <= 0) {
    throw new Error("Cuenta Alegra requerida.");
  }
  const priceListId = String(settings.priceListId || "").trim();
  if (!priceListId) {
    throw new Error("Lista de precios requerida.");
  }
  const sourceClient = new ShopifyClient({
    shopDomain: sourceConnection.shopDomain,
    accessToken: sourceConnection.accessToken,
  });
  const targetClient = new ShopifyClient({
    shopDomain: targetConnection.shopDomain,
    accessToken: targetConnection.accessToken,
  });
  const alegraClient = await getAlegraClient(alegraAccountId);

  const settings: ShopifyStoreProductsSyncSettings = params.settings || {};
  const onlyActive = settings.onlyActive !== false;
  const query = onlyActive ? "status:active" : "status:any";
  const products = await sourceClient.listAllProductsByQuery(query);

  const result: ShopifyStoreProductsSyncResult = {
    ok: true,
    total: products.length,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const product of products) {
    try {
      const identifiers = resolveVariantIdentifiers(product);
      let exists = false;
      for (const identifier of identifiers) {
        const match = await targetClient.findVariantByIdentifier(identifier);
        const edges = match?.productVariants?.edges || [];
        if (edges.length) {
          exists = true;
          break;
        }
      }
      if (exists) {
        result.skipped += 1;
        continue;
      }

      const input = await buildProductCreateInput(product, settings, alegraClient);
      if (!input) {
        result.skipped += 1;
        continue;
      }
      const created = await targetClient.createProduct(input);
      const productId = created?.product?.id || "";

      if (settings.includeImages !== false && productId) {
        const images = resolveProductImages(product);
        if (images.length) {
          await targetClient.addProductImagesByUrl(productId, images);
        }
      }

      result.created += 1;
      await delay(150);
    } catch (error) {
      result.failed += 1;
      result.errors?.push({
        title: product?.title,
        message: error instanceof Error ? error.message : "Error copiando producto",
      });
    }
  }

  if (!result.errors?.length) {
    delete result.errors;
  }

  return result;
}
