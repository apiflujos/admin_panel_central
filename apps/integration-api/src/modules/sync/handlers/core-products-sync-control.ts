import type { Request, Response } from "express";

import { getOrgId } from "../../../../../../src/db";
import { consumeLimitOrBlock } from "../../../../../../src/sa/consume";
import {
  createSyncRun,
  finishSyncRun,
  isSyncRunCancelRequested,
  requestSyncRunCancel,
} from "../../../../../../src/services/sync-runs.service";
import { syncShopifyProductsToAlegraBulk } from "../../../../../../src/services/shopify-products-to-alegra-items.service";

type StreamPayload = Record<string, unknown>;

type ShopifyToAlegraFilters = {
  dateStart?: unknown;
  dateEnd?: unknown;
  limit?: unknown;
};

type ShopifyToAlegraSettings = {
  createInAlegra?: unknown;
  updateInAlegra?: unknown;
  includeInventory?: unknown;
  warehouseId?: unknown;
  matchPriority?: unknown;
};

type ShopifyToAlegraRequestConfig = {
  shopDomain: string;
  dateStart: string;
  dateEnd: string;
  limit?: number;
  createInAlegra: boolean;
  updateInAlegra: boolean;
  includeInventory: boolean;
  warehouseId?: string;
  matchPriority: Array<"sku" | "barcode">;
  stream: boolean;
};

const PRODUCTS_SYNC_TYPE = "products_alegra_to_shopify";
const PRODUCT_IMAGES_SYNC_TYPE = "product_images_shopify";
const PRODUCTS_SHOPIFY_TO_ALEGRA_SYNC_TYPE = "products_shopify_to_alegra";

function createSyncId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function parseShopifyToAlegraRequest(req: Request): ShopifyToAlegraRequestConfig | { error: string } {
  const shopDomain =
    typeof req.body?.shopDomain === "string"
      ? String(req.body.shopDomain).trim()
      : typeof req.query.shopDomain === "string"
        ? String(req.query.shopDomain).trim()
        : "";
  if (!shopDomain) {
    return { error: "shopDomain requerido" };
  }

  const filters = asRecord(req.body?.filters) as ShopifyToAlegraFilters;
  const settings = asRecord(req.body?.settings) as ShopifyToAlegraSettings;
  const dateStart = typeof filters.dateStart === "string" ? filters.dateStart : "";
  const dateEnd = typeof filters.dateEnd === "string" ? filters.dateEnd : "";
  const limitRaw = Number(filters.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;
  const createInAlegra = parseBooleanLike(settings.createInAlegra, false);
  const updateInAlegra = parseBooleanLike(settings.updateInAlegra, true);
  const includeInventory = parseBooleanLike(settings.includeInventory, false);
  const warehouseIdRaw = typeof settings.warehouseId === "string" ? settings.warehouseId.trim() : "";
  if (includeInventory) {
    if (!warehouseIdRaw) return { error: "Bodega destino requerida para incluir inventario." };
    const numeric = Number(warehouseIdRaw);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return { error: "Bodega destino invalida para inventario." };
    }
  }
  const matchPriorityKey = typeof settings.matchPriority === "string" ? settings.matchPriority : "sku_barcode";
  const matchPriority: Array<"sku" | "barcode"> =
    matchPriorityKey === "barcode_sku" ? ["barcode", "sku"] : ["sku", "barcode"];
  const stream = resolveStreamFlag(req.query.stream, req.body?.stream);

  return {
    shopDomain,
    dateStart,
    dateEnd,
    limit,
    createInAlegra,
    updateInAlegra,
    includeInventory,
    warehouseId: warehouseIdRaw || undefined,
    matchPriority,
    stream,
  };
}

export async function syncProductsShopifyToAlegraHandler(req: Request, res: Response) {
  const parsed = parseShopifyToAlegraRequest(req);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { shopDomain, dateStart, dateEnd, limit, createInAlegra, updateInAlegra, includeInventory, warehouseId, matchPriority, stream } =
    parsed;
  const streamState = createNdjsonStream(res, stream);
  const sendStream = streamState.send;

  const startedAt = Date.now();
  const syncId = createSyncId();
  try {
    await createSyncRun(syncId, PRODUCTS_SHOPIFY_TO_ALEGRA_SYNC_TYPE, {
      startedAt,
      shopDomain,
      dateStart: dateStart || null,
      dateEnd: dateEnd || null,
      limit: limit || null,
    });
    streamState.start();

    const summary = await syncShopifyProductsToAlegraBulk({
      shopDomain,
      dateStart,
      dateEnd,
      limit,
      config: {
        enabled: true,
        createInAlegra,
        updateInAlegra,
        includeInventory,
        warehouseId,
        matchPriority,
      },
      isCanceled: () => isSyncRunCancelRequested(syncId),
      onEvent: (payload) => sendStream({ syncId, ...payload }),
    });

    try {
      const amount = Number(summary.processed || 0) || 0;
      if (amount > 0) {
        await consumeLimitOrBlock("products", {
          tenant_id: getOrgId(),
          amount,
          source: "sync/products",
          meta: { direction: "shopify->alegra", shopDomain },
        });
      }
    } catch {
      // ignore billing failures
    }

    if (stream) {
      sendStream({ type: "summary", syncId, ...summary });
      streamState.end();
    } else {
      res.status(200).json({ syncId, ...summary });
    }
    await finishSyncRun(syncId, summary?.canceled ? "canceled" : "completed", { syncId, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync error";
    if (stream) {
      sendStream({ type: "error", syncId, error: message });
      streamState.end();
    } else {
      res.status(400).json({ error: message });
    }
    await finishSyncRun(syncId, "failed", { error: message });
  }
}

export async function stopProductsSyncHandler(req: Request, res: Response) {
  const requestedId = String(req.body?.syncId || "").trim();
  const canceledSyncId = await requestSyncRunCancel(PRODUCTS_SYNC_TYPE, requestedId || undefined);
  if (!canceledSyncId) {
    res.status(200).json({ ok: false, canceled: false, reason: "no_active_sync" });
    return;
  }
  res.status(200).json({ ok: true, canceled: true, syncId: canceledSyncId });
}

export async function stopProductsShopifyToAlegraSyncHandler(req: Request, res: Response) {
  const requestedId = String(req.body?.syncId || "").trim();
  const canceledSyncId = await requestSyncRunCancel(PRODUCTS_SHOPIFY_TO_ALEGRA_SYNC_TYPE, requestedId || undefined);
  if (!canceledSyncId) {
    res.status(200).json({ ok: false, canceled: false, reason: "no_active_sync" });
    return;
  }
  res.status(200).json({ ok: true, canceled: true, syncId: canceledSyncId });
}

export async function stopProductImagesSyncHandler(req: Request, res: Response) {
  const requestedId = String(req.body?.syncId || "").trim();
  const canceledSyncId = await requestSyncRunCancel(PRODUCT_IMAGES_SYNC_TYPE, requestedId || undefined);
  if (!canceledSyncId) {
    res.status(200).json({ ok: false, canceled: false, reason: "no_active_sync" });
    return;
  }
  res.status(200).json({ ok: true, canceled: true, syncId: canceledSyncId });
}
