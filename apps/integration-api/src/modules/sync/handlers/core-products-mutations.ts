import type { Request, Response } from "express";

import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getAlegraConnectionByDomain, getAlegraConnectionByStoreId, getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { AlegraClient } from "../../../../../../src/connectors/alegra";

type ProductMutationBody = {
  alegraId?: unknown;
  sku?: unknown;
  shopDomain?: unknown;
  storeId?: unknown;
  allowOversellAlegra?: unknown;
  allowOversellShopify?: unknown;
  trackInventoryAlegra?: unknown;
  trackInventoryShopify?: unknown;
  inventoryQuantity?: unknown;
  inventoryUnit?: unknown;
};

type ProductMutationResult = {
  alegra?: {
    id: string;
    negativeSale?: boolean;
    tracked?: boolean;
  };
  shopify?: {
    sku: string;
    inventoryPolicy?: "CONTINUE" | "DENY";
    tracked?: boolean;
  };
};

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

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asProductMutationBody(value: unknown): ProductMutationBody {
  return asRecord(value) as ProductMutationBody;
}

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

async function getAlegraClientForStore(shopDomain?: string, storeId?: number) {
  const normalized = shopDomain ? String(shopDomain).trim() : "";
  if (Number.isFinite(storeId)) {
    const conn = await getAlegraConnectionByStoreId(Number(storeId));
    return new AlegraClient({
      email: conn.email,
      apiKey: conn.apiKey,
      baseUrl: getAlegraBaseUrl(conn.environment || "prod"),
    });
  }
  if (normalized) {
    const conn = await getAlegraConnectionByDomain(normalized);
    return new AlegraClient({
      email: conn.email,
      apiKey: conn.apiKey,
      baseUrl: getAlegraBaseUrl(conn.environment || "prod"),
    });
  }
  const alegra = await getAlegraCredential();
  return new AlegraClient({
    email: alegra.email,
    apiKey: alegra.apiKey,
    baseUrl: getAlegraBaseUrl(alegra.environment || "prod"),
  });
}

export async function lookupShopifyHandler(req: Request, res: Response) {
  const skus = Array.isArray(req.body?.skus)
    ? req.body.skus.map((sku: string) => String(sku).trim()).filter(Boolean)
    : [];
  const shopDomain = typeof req.body?.shopDomain === "string" ? String(req.body.shopDomain).trim() : "";
  if (skus.length === 0) {
    res.json({ results: {} });
    return;
  }
  const results: Record<
    string,
    {
      published: boolean;
      status: string;
      productId?: string;
      title?: string;
      inventoryPolicy?: string | null;
      tracked?: boolean;
    }
  > = {};
  const seenProducts = new Map<string, { id?: string; status?: string; title?: string }>();

  try {
    const shopifyCredential = shopDomain
      ? await getShopifyConnectionByDomain(shopDomain)
      : await getShopifyCredential();
    const client = new ShopifyClient({
      shopDomain: shopifyCredential.shopDomain,
      accessToken: shopifyCredential.accessToken,
      apiVersion: resolveShopifyApiVersion((shopifyCredential as { apiVersion?: string }).apiVersion),
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
        inventoryPolicy: variantNode?.inventoryPolicy || null,
        tracked:
          typeof variantNode?.inventoryItem?.tracked === "boolean" ? variantNode.inventoryItem.tracked : undefined,
      };
    }
    res.json({ results });
    await safeCreateLog({
      entity: "shopify_lookup",
      direction: "shopify->alegra",
      status: "success",
      message: "Lookup batch ok",
      request: { skus, shopDomain: shopDomain || null },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Shopify lookup error" });
    await safeCreateLog({
      entity: "shopify_lookup",
      direction: "shopify->alegra",
      status: "fail",
      message: error instanceof Error ? error.message : "Shopify lookup error",
      request: { skus, shopDomain: shopDomain || null },
    });
  }
}

export async function updateProductOversellHandler(req: Request, res: Response) {
  const body = asProductMutationBody(req.body);
  const alegraId = typeof body.alegraId === "string" ? body.alegraId.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain.trim() : "";
  const storeIdRaw = typeof body.storeId === "string" || typeof body.storeId === "number" ? Number(body.storeId) : NaN;
  const storeId = Number.isFinite(storeIdRaw) ? Number(storeIdRaw) : undefined;
  const allowOversellAlegra =
    body.allowOversellAlegra === undefined ? undefined : parseBooleanLike(body.allowOversellAlegra, false);
  const allowOversellShopify =
    body.allowOversellShopify === undefined ? undefined : parseBooleanLike(body.allowOversellShopify, false);

  if (allowOversellAlegra === undefined && allowOversellShopify === undefined) {
    res.status(400).json({ error: "Nada para actualizar." });
    return;
  }

  try {
    const result: ProductMutationResult = {};

    if (allowOversellAlegra !== undefined) {
      if (!alegraId) {
        res.status(400).json({ error: "alegraId requerido." });
        return;
      }
      const alegraClient = await getAlegraClientForStore(shopDomain, storeId);
      await alegraClient.updateItem(alegraId, {
        inventory: {
          negativeSale: allowOversellAlegra,
        },
      });
      result.alegra = { id: alegraId, negativeSale: allowOversellAlegra };
    }

    if (allowOversellShopify !== undefined) {
      if (!sku) {
        res.status(400).json({ error: "sku requerido." });
        return;
      }
      const shopifyCredential = shopDomain
        ? await getShopifyConnectionByDomain(shopDomain)
        : await getShopifyCredential();
      const client = new ShopifyClient({
        shopDomain: shopifyCredential.shopDomain,
        accessToken: shopifyCredential.accessToken,
        apiVersion: resolveShopifyApiVersion((shopifyCredential as { apiVersion?: string }).apiVersion),
      });
      const lookup = await client.findVariantByIdentifier(sku);
      const variantNode = lookup.productVariants?.edges?.[0]?.node;
      if (!variantNode?.id) {
        throw new Error("Variante Shopify no encontrada para el SKU.");
      }
      await client.updateVariantInventoryPolicy(variantNode.id, allowOversellShopify ? "CONTINUE" : "DENY");
      result.shopify = {
        sku,
        inventoryPolicy: allowOversellShopify ? "CONTINUE" : "DENY",
      };
    }

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Update error" });
  }
}

export async function updateProductTrackingHandler(req: Request, res: Response) {
  const body = asProductMutationBody(req.body);
  const alegraId = typeof body.alegraId === "string" ? body.alegraId.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain.trim() : "";
  const storeIdRaw = typeof body.storeId === "string" || typeof body.storeId === "number" ? Number(body.storeId) : NaN;
  const storeId = Number.isFinite(storeIdRaw) ? Number(storeIdRaw) : undefined;
  const trackInventoryAlegra =
    body.trackInventoryAlegra === undefined ? undefined : parseBooleanLike(body.trackInventoryAlegra, false);
  const trackInventoryShopify =
    body.trackInventoryShopify === undefined ? undefined : parseBooleanLike(body.trackInventoryShopify, false);
  const inventoryQuantityRaw =
    typeof body.inventoryQuantity === "number"
      ? body.inventoryQuantity
      : typeof body.inventoryQuantity === "string" && body.inventoryQuantity.trim() !== ""
        ? Number(body.inventoryQuantity)
        : null;
  const inventoryQuantity =
    typeof inventoryQuantityRaw === "number" && Number.isFinite(inventoryQuantityRaw) ? inventoryQuantityRaw : null;
  const inventoryUnit = typeof body.inventoryUnit === "string" ? body.inventoryUnit.trim() : "u";
  const allowOversellAlegra =
    body.allowOversellAlegra === undefined ? undefined : parseBooleanLike(body.allowOversellAlegra, false);

  if (trackInventoryAlegra === undefined && trackInventoryShopify === undefined) {
    res.status(400).json({ error: "Nada para actualizar." });
    return;
  }

  try {
    const result: ProductMutationResult = {};

    if (trackInventoryAlegra !== undefined) {
      if (!alegraId) {
        res.status(400).json({ error: "alegraId requerido." });
        return;
      }
      const alegraClient = await getAlegraClientForStore(shopDomain, storeId);
      const payload: { inventory?: { unit: string; initialQuantity: number; negativeSale?: boolean } | null } = {};
      if (trackInventoryAlegra) {
        payload.inventory = {
          unit: inventoryUnit || "u",
          initialQuantity: inventoryQuantity ?? 0,
          ...(allowOversellAlegra !== undefined ? { negativeSale: allowOversellAlegra } : {}),
        };
      } else {
        payload.inventory = null;
      }
      await alegraClient.updateItem(alegraId, payload);
      result.alegra = { id: alegraId, tracked: trackInventoryAlegra };
    }

    if (trackInventoryShopify !== undefined) {
      if (!sku) {
        res.status(400).json({ error: "sku requerido." });
        return;
      }
      const shopifyCredential = shopDomain
        ? await getShopifyConnectionByDomain(shopDomain)
        : await getShopifyCredential();
      const client = new ShopifyClient({
        shopDomain: shopifyCredential.shopDomain,
        accessToken: shopifyCredential.accessToken,
        apiVersion: resolveShopifyApiVersion((shopifyCredential as { apiVersion?: string }).apiVersion),
      });
      const lookup = await client.findVariantByIdentifier(sku);
      const variantNode = lookup.productVariants?.edges?.[0]?.node;
      const inventoryItemId = variantNode?.inventoryItem?.id || "";
      if (!inventoryItemId) {
        throw new Error("InventoryItem no encontrado para el SKU.");
      }
      await client.updateInventoryItemTracking(inventoryItemId, trackInventoryShopify);
      result.shopify = { sku, tracked: trackInventoryShopify };
    }

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Update error" });
  }
}
