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
};

type CrossStoreProductsSyncParams = {
  sourceProvider: "shopify" | "woocommerce";
  targetProvider: "shopify" | "woocommerce";
  sourceShopDomain: string;
  targetShopDomain: string;
  settings?: CrossStoreProductsSyncSettings;
};

type CrossStoreProductsSyncResult = {
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
    normalizePriceListId(raw.priceListId) ||
    normalizePriceListId(raw.priceList?.id) ||
    normalizePriceListId(raw.id)
  );
};

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
  return (product.images || [])
    .map((image) => String(image?.src || "").trim())
    .filter((url) => url.length > 0);
}

function resolveShopifyProductImages(product: ShopifyProduct) {
  const edges = product?.images?.edges || [];
  return edges
    .map((edge) => String(edge?.node?.url || "").trim())
    .filter((url) => url.length > 0);
}

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
    const variant: { price?: string; sku?: string; barcode?: string; options?: string[] } = {
      sku: variation?.sku ? String(variation.sku).trim() : undefined,
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
    productType: includeProductType
      ? String(product.categories?.[0]?.name || "").trim() || undefined
      : undefined,
    tags: includeTags ? (product.tags || []).map((tag) => String(tag?.name || "").trim()).filter(Boolean) : undefined,
    options: optionNames.length ? optionNames : undefined,
    variants,
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
  }>;

  for (const { node } of product?.variants?.edges || []) {
    const variant: { price?: string; sku?: string; attributes?: Array<{ name: string; option: string }> } = {
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
  const alegraAccountId = Number(settings.alegraAccountId || 0);
  if (!Number.isFinite(alegraAccountId) || alegraAccountId <= 0) {
    throw new Error("Cuenta Alegra requerida.");
  }
  const priceListId = String(settings.priceListId || "").trim();
  if (!priceListId) {
    throw new Error("Lista de precios requerida.");
  }

  const alegraClient = await getAlegraClient(alegraAccountId);

  let sourceProducts: Array<{ product: ShopifyProduct | WooProduct; variations?: WooVariation[] }> = [];

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
    const products = await sourceClient.listAllProducts({ status });
    const enriched = [] as Array<{ product: WooProduct; variations?: WooVariation[] }>;
    for (const product of products) {
      if (product.type === "variable") {
        const variations = await sourceClient.listAllProductVariations(product.id);
        enriched.push({ product, variations });
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
    skipped: 0,
    failed: 0,
    errors: [],
  };

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

  for (const entry of sourceProducts) {
    try {
      if (params.sourceProvider === "shopify") {
        const product = entry.product as ShopifyProduct;
        const identifiers = resolveShopifyVariantIdentifiers(product);
        let exists = false;
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
              break;
            }
          }
        }
        if (exists) {
          result.skipped += 1;
          continue;
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
              }>
            | undefined;
          if (rawPayload._variations) {
            delete rawPayload._variations;
          }
          const created = await targetWoo.createProduct(rawPayload);
          if (variationsPayload && created?.id) {
            const variations = variationsPayload;
            for (const variation of variations) {
              await targetWoo.createVariation(created.id, {
                sku: variation.sku,
                regular_price: variation.price,
                attributes: variation.attributes,
              });
            }
          }
          result.created += 1;
          await delay(150);
        }
      } else {
        const product = entry.product as WooProduct;
        const variations = entry.variations || [];
        const identifiers = resolveWooIdentifiers(product, variations);
        let exists = false;
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
              break;
            }
          }
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
  }

  if (!result.errors?.length) {
    delete result.errors;
  }

  return result;
}
