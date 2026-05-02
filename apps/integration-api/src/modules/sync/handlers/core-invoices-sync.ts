import type { Request, Response } from "express";

import { getOrgId } from "../../../../../../src/db";
import { consumeLimitOrBlock } from "../../../../../../src/sa/consume";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import {
  syncAlegraInvoicesToShopifyOrders,
  type InvoiceToShopifyMode,
} from "../../../../../../src/services/alegra-invoices-to-shopify-orders.service";

const parseBooleanLike = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return fallback;
  if (lowered === "1" || lowered === "true" || lowered === "yes" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "no" || lowered === "off") return false;
  return fallback;
};

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore
  }
};

export async function syncInvoicesToShopifyHandler(req: Request, res: Response) {
  const stream = req.query.stream === "1" || req.query.stream === "true" || parseBooleanLike(req.body?.stream, false);
  let streamOpen = stream;
  const sendStream = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };

  const body = (req.body || {}) as {
    shopDomain?: string;
    mode?: InvoiceToShopifyMode;
    filters?: { dateStart?: string; dateEnd?: string; limit?: number };
    stream?: boolean;
  };
  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain.trim() : "";
  const mode: InvoiceToShopifyMode = body.mode === "active" ? "active" : "draft";
  const filters = body.filters || {};
  const startedAt = Date.now();

  try {
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }

    const result = await syncAlegraInvoicesToShopifyOrders({
      shopDomain: shopDomain || undefined,
      mode,
      filters: {
        dateStart: filters.dateStart || null,
        dateEnd: filters.dateEnd || null,
        limit: typeof filters.limit === "number" ? filters.limit : Number(filters.limit || 0) || null,
      },
      onProgress: (event) => {
        if (stream) {
          sendStream(event);
        }
      },
    });

    try {
      const orgId = getOrgId();
      const amount = Number(result.processed || 0) || 0;
      if (amount > 0) {
        await consumeLimitOrBlock("invoices", {
          tenant_id: orgId,
          amount,
          source: "sync/invoices",
          meta: { shopDomain: shopDomain || null, mode, filters },
        });
      }
    } catch {
      // ignore billing failures
    }

    if (stream) {
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "invoices_to_shopify",
        direction: "alegra->shopify",
        status: "success",
        message: "Sync facturas->Shopify ok",
        request: { shopDomain: shopDomain || null, mode, filters },
        response: result as Record<string, unknown>,
      });
      return;
    }

    res.json({ ok: true, startedAt, ...result });
    await safeCreateLog({
      entity: "invoices_to_shopify",
      direction: "alegra->shopify",
      status: "success",
      message: "Sync facturas->Shopify ok",
      request: { shopDomain: shopDomain || null, mode, filters },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoices sync error";
    if (stream) {
      sendStream({ type: "error", error: message });
      streamOpen = false;
      res.end();
      await safeCreateLog({
        entity: "invoices_to_shopify",
        direction: "alegra->shopify",
        status: "fail",
        message,
        request: { shopDomain: shopDomain || null, mode, filters },
      });
      return;
    }
    res.status(500).json({ error: message });
    await safeCreateLog({
      entity: "invoices_to_shopify",
      direction: "alegra->shopify",
      status: "fail",
      message,
      request: { shopDomain: shopDomain || null, mode, filters },
    });
  }
}
