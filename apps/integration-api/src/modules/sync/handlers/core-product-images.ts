import type { Request, Response } from "express";

import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getShopifyCredential } from "../../../../../../src/services/settings.service";
import { getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { createSyncRun, finishSyncRun, isSyncRunCancelRequested } from "../../../../../../src/services/sync-runs.service";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";

type JsonObject = Record<string, unknown>;

type ProductImagesSyncInputRow = {
  identifier?: unknown;
  urls?: unknown;
  alt?: unknown;
};

type ProductImagesSyncRow = {
  identifier: string;
  urls: string[];
  alt: string | null;
};

type ProductImagesSyncBody = {
  shopDomain?: unknown;
  matchBy?: unknown;
  attachVariant?: unknown;
  mode?: unknown;
  publishEnabled?: unknown;
  publishStatus?: unknown;
  dryRun?: unknown;
  rows?: unknown;
  stream?: unknown;
};

type ProductImageCreatePayload = {
  src: string;
  alt?: string;
  variant_ids?: number[];
};

type ProductImagesDonePayload = {
  type: "done";
  syncId: string;
  total: number;
  processed: number;
  matched: number;
  imagesUploaded: number;
  skipped: number;
  failed: number;
  message: string;
};

type ShopifyConfig = {
  shopDomain: string;
  baseAdmin: string;
  accessToken: string;
  apiVersion: string;
  vendorDefault: string;
  locationId: string;
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

function resolveStreamFlag(queryValue: unknown, bodyValue: unknown) {
  if (queryValue === "1" || queryValue === "true") return true;
  return parseBooleanLike(bodyValue, false);
}

function createNdjsonStream(res: Response, enabled: boolean) {
  let open = enabled;
  const send = (payload: Record<string, unknown>) => {
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

function createSyncId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asProductImagesSyncBody(value: unknown): ProductImagesSyncBody {
  return asRecord(value) as ProductImagesSyncBody;
}

function normalizeProductImagesRows(value: unknown): ProductImagesSyncRow[] {
  const rowsInput = Array.isArray(value) ? value : [];
  return rowsInput
    .slice(0, 500)
    .map((row) => (row && typeof row === "object" ? (row as ProductImagesSyncInputRow) : null))
    .filter((row): row is ProductImagesSyncInputRow => Boolean(row))
    .map((row) => {
      const identifier = typeof row.identifier === "string" ? row.identifier.trim() : "";
      const urlsRaw = Array.isArray(row.urls) ? row.urls : [];
      const urls = urlsRaw
        .map((item) => String(item || "").trim())
        .filter((item) => item.startsWith("http://") || item.startsWith("https://"))
        .slice(0, 10);
      const alt = typeof row.alt === "string" ? row.alt.trim() : "";
      return { identifier, urls, alt: alt || null };
    })
    .filter((row) => Boolean(row.identifier));
}

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

async function fetchShopifyResponse(path: string, options: RequestInit = {}, configOverride?: ShopifyConfig) {
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
    const text = await response.text().catch(() => "");
    throw new Error(`Shopify HTTP ${response.status}: ${text}`);
  }
  return response;
}

const extractNumericShopifyId = (gid: string) => {
  const raw = String(gid || "").trim();
  const match = raw.match(/\/(\d+)$|^(\d+)$/);
  return match ? match[1] || match[2] || "" : "";
};

const PRODUCT_IMAGES_SYNC_TYPE = "product_images_shopify";

export async function syncProductImagesHandler(req: Request, res: Response) {
  const body = asProductImagesSyncBody(req.body);
  const shopDomainInput = typeof body.shopDomain === "string" ? body.shopDomain : "";
  const matchBy = body.matchBy === "barcode" ? "barcode" : "sku";
  const attachVariant = parseBooleanLike(body.attachVariant, true);
  const mode = body.mode === "replace" ? "replace" : "append";
  const publishEnabled = parseBooleanLike(body.publishEnabled, false);
  const publishStatus = body.publishStatus === "active" ? "active" : "draft";
  const dryRun = parseBooleanLike(body.dryRun, false);
  const rows = normalizeProductImagesRows(body.rows);

  const stream = resolveStreamFlag(req.query.stream, body.stream);
  const streamState = createNdjsonStream(res, stream);
  const sendStream = streamState.send;

  if (!rows.length) {
    res.status(400).json({ error: "rows requerido (max 500)." });
    return;
  }

  const startedAt = Date.now();
  const syncId = createSyncId();

  let processed = 0;
  let matched = 0;
  let imagesUploaded = 0;
  let skipped = 0;
  let failed = 0;

  try {
    await createSyncRun(syncId, PRODUCT_IMAGES_SYNC_TYPE, {
      startedAt,
      shopDomain: shopDomainInput || null,
      total: rows.length,
    });
    streamState.start();

    const shopifyConfig = await getShopifyConfig(shopDomainInput ? String(shopDomainInput) : "");
    if (!shopifyConfig.shopDomain || !shopifyConfig.accessToken) {
      throw new Error("Shopify no conectado para esta tienda.");
    }
    const client = new ShopifyClient({
      shopDomain: shopifyConfig.shopDomain,
      accessToken: shopifyConfig.accessToken,
      apiVersion: shopifyConfig.apiVersion,
    });

    const clearedProducts = new Set<string>();

    const clearProductImages = async (productId: string) => {
      const response = await fetchShopifyResponse(
        `/products/${encodeURIComponent(productId)}/images.json`,
        { method: "GET" },
        shopifyConfig
      );
      const json = (await response.json().catch(() => ({}))) as { images?: Array<{ id?: number }> };
      const images = Array.isArray(json.images) ? json.images : [];
      for (const image of images) {
        const imageId = image?.id ? String(image.id) : "";
        if (!imageId) continue;
        await fetchShopifyResponse(
          `/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}.json`,
          { method: "DELETE" },
          shopifyConfig
        );
      }
    };

    const uploadProductImage = async (productId: string, url: string, alt: string | null, variantId?: string) => {
      const payload: ProductImageCreatePayload = { src: url };
      if (alt) payload.alt = alt;
      if (variantId) payload.variant_ids = [Number(variantId)];
      await fetchShopifyResponse(
        `/products/${encodeURIComponent(productId)}/images.json`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: payload }),
        },
        shopifyConfig
      );
    };

    const setProductStatus = async (productId: string, status: "draft" | "active") => {
      await fetchShopifyResponse(
        `/products/${encodeURIComponent(productId)}.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: { id: Number(productId), status } }),
        },
        shopifyConfig
      );
    };

    sendStream({
      type: "start",
      syncId,
      startedAt,
      total: rows.length,
      matchBy,
      dryRun,
      mode,
    });

    for (const row of rows) {
      if (await isSyncRunCancelRequested(syncId)) {
        sendStream({ type: "stopped", syncId, processed, total: rows.length });
        await finishSyncRun(syncId, "canceled", { processed, matched, imagesUploaded, skipped, failed });
        break;
      }
      processed += 1;
      const identifier = row.identifier;
      try {
        const lookup = await client.findVariantByIdentifier(identifier);
        const node = lookup?.productVariants?.edges?.[0]?.node;
        const productGid = node?.product?.id ? String(node.product.id) : "";
        const variantGid = node?.id ? String(node.id) : "";
        const productId = extractNumericShopifyId(productGid);
        const variantId = extractNumericShopifyId(variantGid);

        if (!productId) {
          skipped += 1;
          sendStream({ type: "row_error", message: `[${identifier}] No encontrado en Shopify (${matchBy}).` });
          sendStream({ type: "progress", syncId, total: rows.length, processed, matched, imagesUploaded, skipped, failed });
          continue;
        }

        const urls = Array.isArray(row.urls) ? row.urls : [];
        if (!urls.length) {
          skipped += 1;
          sendStream({ type: "row_error", message: `[${identifier}] Sin URLs.` });
          sendStream({ type: "progress", syncId, total: rows.length, processed, matched, imagesUploaded, skipped, failed });
          continue;
        }

        matched += 1;
        if (dryRun) {
          sendStream({ type: "progress", syncId, total: rows.length, processed, matched, imagesUploaded, skipped, failed });
          continue;
        }

        if (mode === "replace" && !clearedProducts.has(productId)) {
          await clearProductImages(productId);
          clearedProducts.add(productId);
        }

        for (const url of urls) {
          try {
            const parsed = new URL(url);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
              continue;
            }
          } catch {
            continue;
          }
          await uploadProductImage(productId, url, row.alt, attachVariant && variantId ? variantId : undefined);
          imagesUploaded += 1;
        }

        if (publishEnabled) {
          await setProductStatus(productId, publishStatus);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error || "error");
        sendStream({ type: "row_error", message: `[${identifier}] ${message}` });
      }

      sendStream({ type: "progress", syncId, total: rows.length, processed, matched, imagesUploaded, skipped, failed });
    }

    const donePayload: ProductImagesDonePayload = {
      type: "done",
      syncId,
      total: rows.length,
      processed,
      matched,
      imagesUploaded,
      skipped,
      failed,
      message: dryRun ? "Simulación completada." : "Carga de fotos completada.",
    };
    if (stream) {
      sendStream(donePayload);
      streamState.end();
    } else {
      res.status(200).json(donePayload);
    }
    await finishSyncRun(syncId, "completed", donePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync product images error";
    if (stream) {
      sendStream({ type: "row_error", message });
      sendStream({ type: "done", syncId, processed, total: rows.length, failed: failed + 1, message });
      streamState.end();
    } else {
      res.status(500).json({ error: message });
    }
    await finishSyncRun(syncId, "failed", { error: message, processed, matched, imagesUploaded, skipped, failed });
  }
}
