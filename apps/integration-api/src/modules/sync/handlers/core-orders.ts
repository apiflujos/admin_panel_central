import type { Request, Response } from "express";

import { AlegraClient } from "../../../../../../src/connectors/alegra";
import { ShopifyClient, ShopifyOrder } from "../../../../../../src/connectors/shopify";
import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../../../../../../src/db";
import { mapOrderToPayload } from "../../../../../../src/services/operations.service";
import { getMappingByAlegraId, getMappingByShopifyId } from "../../../../../../src/services/mapping.service";
import { listOrderInvoiceOverrides, validateEinvoiceData } from "../../../../../../src/services/order-invoice-overrides.service";
import { listOrders, upsertOrder } from "../../../../../../src/services/orders.service";
import { getAlegraCredential, getShopifyCredential } from "../../../../../../src/services/settings.service";
import { syncShopifyOrderToAlegra } from "../../../../../../src/services/shopify-to-alegra.service";
import { getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { consumeLimitOrBlock } from "../../../../../../src/sa/consume";
import { getAlegraBaseUrl } from "../../../../../../src/utils/alegra-env";
import { resolveShopifyApiVersion } from "../../../../../../src/utils/shopify";

const resolveInvoiceNumber = (invoice: Record<string, unknown> | null) => {
  const template = invoice?.numberTemplate as Record<string, unknown> | undefined;
  const full = template?.fullNumber ? String(template.fullNumber) : "";
  const formatted = template?.formattedNumber ? String(template.formattedNumber) : "";
  const prefix = template?.prefix ? String(template.prefix) : "";
  const number = template?.number ? String(template.number) : "";
  if (full) return full;
  if (formatted) return formatted;
  if (prefix && number) return `${prefix}${number}`;
  return null;
};

const buildCustomerName = (order: ShopifyOrder) => {
  const first = order.customer?.firstName || "";
  const last = order.customer?.lastName || "";
  const name = `${first} ${last}`.trim();
  return name || order.email || "Cliente";
};

const buildProductsSummary = (order: ShopifyOrder) => {
  const items = order.lineItems?.edges || [];
  if (!items.length) return "-";
  return items
    .map((edge) => {
      const qty = edge.node.quantity || 0;
      const title = edge.node.title || "Item";
      return `${qty}x ${title}`;
    })
    .join(", ");
};

const resolveOrderTotal = (order: ShopifyOrder) => {
  const raw = order.totalPriceSet?.shopMoney?.amount;
  const parsed = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(parsed as number) ? Number(parsed) : null;
};

const resolveOrderCurrency = (order: ShopifyOrder) => {
  return order.totalPriceSet?.shopMoney?.currencyCode || null;
};

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

const asRecord = (value: unknown) => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
};

const resolveStreamFlag = (queryValue: unknown, bodyValue: unknown) => {
  if (queryValue === "1" || queryValue === "true") return true;
  return parseBooleanLike(bodyValue, false);
};

const createNdjsonStream = (res: Response, enabled: boolean) => {
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
};

const resolveOrderSyncOutcome = (result: unknown): "synced" | "skipped" | "failed" => {
  const payload = asRecord(result);
  if (payload.handled === false) return "failed";
  if (payload.skipped === true) return "skipped";
  if (typeof payload.skipped === "string" && payload.skipped.trim()) return "skipped";
  return "synced";
};

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

async function loadEinvoiceEnabled() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureInvoiceSettingsColumns(pool);
  const result = await pool.query<{ einvoice_enabled: boolean | null }>(
    `
    SELECT einvoice_enabled
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return false;
  }
  return Boolean(result.rows[0].einvoice_enabled);
}

async function resolveBackfillShopifyCredential(
  shopDomain?: string | null
): Promise<{ shopDomain: string; accessToken: string; apiVersion?: string }> {
  const normalizedShopDomain = typeof shopDomain === "string" ? shopDomain.trim() : "";
  if (!normalizedShopDomain) {
    return getShopifyCredential();
  }

  const connection = await getShopifyConnectionByDomain(normalizedShopDomain);
  if (connection) {
    return {
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    };
  }

  const legacyCredential = await getShopifyCredential();
  if (legacyCredential.shopDomain === normalizedShopDomain) {
    return legacyCredential;
  }

  throw new Error(`Shopify connection not found for ${normalizedShopDomain}`);
}

export async function listOrdersHandler(req: Request, res: Response) {
  try {
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const date = typeof req.query.date === "string" ? req.query.date : "";
    const days = Number(req.query.days || 0);
    const sort = typeof req.query.sort === "string" ? req.query.sort : "date_desc";
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    const result = await listOrders({
      shopDomain: shopDomain || undefined,
      query: query || undefined,
      date: date || undefined,
      days: Number.isFinite(days) && days > 0 ? days : undefined,
      sort,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    });

    const orderIds = result.items.map((row) => row.shopify_order_id).filter(Boolean) as string[];
    const overrides = await listOrderInvoiceOverrides(orderIds);
    const einvoiceEnabled = await loadEinvoiceEnabled();

    const items = result.items.map((row) => {
      const shopifyId = row.shopify_order_id ? String(row.shopify_order_id) : "";
      const override = shopifyId ? overrides.get(shopifyId) || null : null;
      const missing = einvoiceEnabled ? validateEinvoiceData(override) : [];
      const alegraStatus = row.alegra_status || (row.alegra_invoice_id ? "facturado" : "pendiente");
      return {
        id: shopifyId || "",
        shopifyId: shopifyId || null,
        orderNumber: row.shopify_order_number || row.alegra_invoice_id || "-",
        processedAt: row.processed_at || row.updated_at,
        customer: row.customer_name || row.customer_email || "-",
        customerEmail: row.customer_email || null,
        products: row.products_summary || "-",
        alegraStatus,
        invoiceId: row.alegra_invoice_id || null,
        invoiceNumber: row.invoice_number || null,
        einvoiceRequested: parseBooleanLike(override?.einvoiceRequested, false),
        einvoiceMissing: missing,
      };
    });

    res.json({ items, total: result.total, limit: result.limit, offset: result.offset });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Orders list error" });
  }
}

export async function backfillOrdersHandler(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as {
      source?: string;
      limit?: number;
      dateStart?: string;
      dateEnd?: string;
      days?: number;
      shopDomain?: string;
    };
    const shopDomainInput = typeof req.body?.shopDomain === "string" ? String(req.body.shopDomain).trim() : "";
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
    const source = String(body.source || "both").toLowerCase();
    const limit = Number.isFinite(body.limit) && Number(body.limit) > 0 ? Number(body.limit) : null;
    const dateStart = body.dateStart ? String(body.dateStart) : "";
    const dateEnd = body.dateEnd ? String(body.dateEnd) : "";
    const days = Number.isFinite(body.days) && Number(body.days) > 0 ? Number(body.days) : null;
    const results: Record<string, unknown> = {};
    const startedAt = Date.now();

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

    sendStream({ type: "start", startedAt, total: limit });

    if (source === "shopify" || source === "both") {
      const shopifyCredential = await resolveBackfillShopifyCredential(shopDomainInput);
      const client = new ShopifyClient({
        shopDomain: shopifyCredential.shopDomain,
        accessToken: shopifyCredential.accessToken,
        apiVersion: resolveShopifyApiVersion(shopifyCredential.apiVersion),
      });
      const parts = ["status:any"];
      if (dateStart) parts.push(`updated_at:>='${dateStart}'`);
      if (dateEnd) parts.push(`updated_at:<='${dateEnd}'`);
      if (!dateStart && !dateEnd && days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        parts.push(`updated_at:>='${cutoff}'`);
      }
      const query = parts.join(" ");
      const orders = await client.listAllOrdersByQuery(query, limit || undefined);
      let processed = 0;
      for (const order of orders) {
        const mapping = await getMappingByShopifyId("order", String(order.id));
        const alegraId = mapping?.alegraId || null;
        const invoiceNumber = mapping?.metadata?.invoiceNumber ? String(mapping.metadata.invoiceNumber) : null;
        const alegraStatus = alegraId ? "facturado" : "pendiente";
        await upsertOrder({
          shopDomain: shopifyCredential.shopDomain,
          shopifyId: order.id,
          alegraId,
          orderNumber: order.name,
          customerName: buildCustomerName(order),
          customerEmail: order.email || order.customer?.email || null,
          productsSummary: buildProductsSummary(order),
          processedAt: order.processedAt || null,
          status: order.displayFinancialStatus || null,
          total: resolveOrderTotal(order),
          currency: resolveOrderCurrency(order),
          alegraStatus,
          invoiceNumber,
          source: "shopify",
          sourceUpdatedAt: order.updatedAt || order.processedAt || null,
        });
        processed += 1;
      }
      results.shopify = { processed };
    }

    if (source === "alegra" || source === "both") {
      const alegraCredential = await getAlegraCredential();
      const baseUrl = getAlegraBaseUrl(alegraCredential.environment || "prod");
      const client = new AlegraClient({
        email: alegraCredential.email,
        apiKey: alegraCredential.apiKey,
        baseUrl,
      });
      let effectiveShopDomain = shopDomainInput;
      if (!effectiveShopDomain) {
        try {
          const shopifyCredential = await getShopifyCredential();
          effectiveShopDomain = shopifyCredential.shopDomain;
        } catch {
          effectiveShopDomain = "";
        }
      }
      let start = 0;
      const pageSize = 30;
      let processed = 0;
      let pages = 0;
      while (true) {
        if (limit !== null && processed >= limit) break;
        const batchLimit = limit !== null ? Math.min(pageSize, Math.max(0, limit - processed)) : pageSize;
        if (batchLimit <= 0) break;
        const invoices = (await client.listInvoices({ limit: batchLimit, start })) as Array<Record<string, unknown>>;
        if (!Array.isArray(invoices) || !invoices.length) break;
        for (const invoice of invoices) {
          const alegraId = invoice.id ? String(invoice.id) : null;
          if (!alegraId) continue;
          const mapping = await getMappingByAlegraId("order", alegraId);
          const shopifyId = mapping?.shopifyId || null;
          const invoiceNumber =
            resolveInvoiceNumber(invoice) ||
            (mapping?.metadata?.invoiceNumber ? String(mapping.metadata.invoiceNumber) : null);
          const clientInfo = invoice.client as Record<string, unknown> | undefined;
          const processedAt =
            (invoice.date as string | undefined) ||
            (invoice.datetime as string | undefined) ||
            (invoice.createdAt as string | undefined) ||
            null;
          const total = typeof invoice.total === "number" ? invoice.total : Number(invoice.total || 0);
          await upsertOrder({
            shopDomain: effectiveShopDomain || undefined,
            shopifyId,
            alegraId,
            orderNumber: invoiceNumber || shopifyId || null,
            customerName: clientInfo?.name ? String(clientInfo.name) : null,
            customerEmail: clientInfo?.email ? String(clientInfo.email) : null,
            productsSummary: null,
            processedAt,
            status: invoice.status ? String(invoice.status) : null,
            total: Number.isFinite(total) ? total : null,
            currency: invoice.currency ? String(invoice.currency) : null,
            alegraStatus: invoice.status ? String(invoice.status) : "facturado",
            invoiceNumber,
            source: "alegra",
            sourceUpdatedAt: processedAt,
          });
          processed += 1;
          sendStream({ type: "progress", processed, pages, total: limit });
          if (limit !== null && processed >= limit) break;
        }
        start += invoices.length;
        pages += 1;
        sendStream({ type: "progress", processed, pages, total: limit });
        if (invoices.length < batchLimit) break;
      }
      results.alegra = { processed, pages };
    }

    try {
      const amount = Number((results.shopify as any)?.processed || 0) + Number((results.alegra as any)?.processed || 0);
      if (amount > 0) {
        await consumeLimitOrBlock("orders", {
          tenant_id: getOrgId(),
          amount,
          source: "backfill/orders",
          meta: { source, dateStart: dateStart || null, dateEnd: dateEnd || null, days: days || null, limit },
        });
      }
    } catch {
      // ignore billing failures
    }

    if (stream) {
      sendStream({
        type: "complete",
        ok: true,
        processed: (results.alegra as any)?.processed ?? (results.shopify as any)?.processed ?? 0,
        pages: (results.alegra as any)?.pages ?? 0,
        results,
      });
      streamOpen = false;
      res.end();
      return;
    }
    res.json({ ok: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backfill error";
    if (req.query.stream === "1" || req.query.stream === "true" || parseBooleanLike(req.body?.stream, false)) {
      try {
        res.write(`${JSON.stringify({ type: "error", error: message })}\n`);
      } catch {
        // ignore
      }
      res.end();
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Backfill error" });
  }
}

export async function syncOrdersHandler(req: Request, res: Response) {
  const { filters = {} } = req.body || {};
  const shopDomainInput =
    typeof req.body?.shopDomain === "string"
      ? String(req.body.shopDomain).trim()
      : typeof filters?.shopDomain === "string"
        ? String(filters.shopDomain).trim()
        : "";
  const stream = resolveStreamFlag(req.query.stream, req.body?.stream);
  const streamState = createNdjsonStream(res, stream);
  const sendStream = streamState.send;
  const startedAt = Date.now();
  try {
    streamState.start();
    const shopifyCredential = shopDomainInput
      ? await getShopifyConnectionByDomain(shopDomainInput)
      : await getShopifyCredential();
    const effectiveShopDomain = shopifyCredential.shopDomain;
    const client = new ShopifyClient({
      shopDomain: effectiveShopDomain,
      accessToken: shopifyCredential.accessToken,
      apiVersion: resolveShopifyApiVersion((shopifyCredential as { apiVersion?: string }).apiVersion),
    });
    let orders: ShopifyOrder[] = [];
    const limit = Number(filters.limit || 0);
    const orderNumber = String(filters.orderNumber || "")
      .replace(/^#/, "")
      .trim();
    if (orderNumber) {
      orders = await client.listAllOrdersByQuery(`name:${orderNumber}`);
    } else if (filters.dateStart || filters.dateEnd) {
      const parts = [];
      if (filters.dateStart) parts.push(`created_at:>='${filters.dateStart}'`);
      if (filters.dateEnd) parts.push(`created_at:<='${filters.dateEnd}'`);
      orders = await client.listAllOrdersByQuery(parts.join(" "), limit > 0 ? limit : undefined);
    } else {
      orders = await client.listAllOrdersByQuery("status:any", limit > 0 ? limit : undefined);
    }
    if (limit > 0) {
      orders = orders.slice(0, limit);
    }
    const total = orders.length;
    sendStream({ type: "start", startedAt, total });
    let processed = 0;
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const step = Math.max(1, Math.ceil(total / 20));
    for (const order of orders) {
      processed += 1;
      try {
        const mapping = await getMappingByShopifyId("order", String(order.id));
        const invoiceNumber =
          mapping?.metadata && typeof mapping.metadata === "object"
            ? (mapping.metadata as { invoiceNumber?: string }).invoiceNumber
            : undefined;
        await upsertOrder({
          shopDomain: effectiveShopDomain,
          shopifyId: order.id,
          alegraId: mapping?.alegraId || undefined,
          orderNumber: order.name,
          customerName: buildCustomerName(order),
          customerEmail: order.email || order.customer?.email || undefined,
          productsSummary: buildProductsSummary(order),
          processedAt: order.processedAt || order.updatedAt || undefined,
          status: order.displayFinancialStatus || undefined,
          total: resolveOrderTotal(order),
          currency: resolveOrderCurrency(order) || undefined,
          alegraStatus: mapping?.alegraId ? "facturado" : "pendiente",
          invoiceNumber: invoiceNumber || undefined,
          source: "shopify",
          sourceUpdatedAt: order.updatedAt || order.processedAt || undefined,
        });
        if (mapping?.alegraId) {
          skipped += 1;
        } else {
          const payload = mapOrderToPayload(order);
          const result = await syncShopifyOrderToAlegra({
            ...asRecord(payload),
            __shopDomain: effectiveShopDomain,
          });
          const outcome = resolveOrderSyncOutcome(result);
          if (outcome === "skipped") skipped += 1;
          else if (outcome === "failed") failed += 1;
          else synced += 1;
        }
      } catch {
        failed += 1;
      }
      if (processed % step === 0 || processed === total) {
        sendStream({ type: "progress", processed, total, synced, skipped, failed });
      }
    }
    const responsePayload = { ok: true, count: total, orders, synced, skipped, failed };
    if (stream) {
      sendStream({ type: "complete", processed, total, ...responsePayload });
      streamState.end();
      await safeCreateLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "success",
        message: "Sync pedidos ok",
        request: { filters, shopDomain: effectiveShopDomain || null },
        response: { count: total, processed, total, synced, skipped, failed },
      });
      return;
    }
    res.json(responsePayload);
    await safeCreateLog({
      entity: "orders_sync",
      direction: "shopify->alegra",
      status: "success",
      message: "Sync pedidos ok",
      request: { filters, shopDomain: effectiveShopDomain || null },
      response: { count: total, processed, total, synced, skipped, failed },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders sync error";
    if (stream) {
      sendStream({ type: "error", error: message });
      streamState.end();
      await safeCreateLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "fail",
        message,
        request: { filters },
      });
      return;
    }
    res.status(500).json({ error: message });
    await safeCreateLog({
      entity: "orders_sync",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { filters },
    });
  }
}
