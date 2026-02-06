import type { Request, Response } from "express";
import { listOrders, upsertOrder } from "../services/orders.service";
import { listOrderInvoiceOverrides, validateEinvoiceData } from "../services/order-invoice-overrides.service";
import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../db";
import { consumeLimitOrBlock } from "../sa/consume";
import { getAlegraCredential, getShopifyCredential } from "../services/settings.service";
import { AlegraClient } from "../connectors/alegra";
import { ShopifyClient, ShopifyOrder } from "../connectors/shopify";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { getMappingByAlegraId, getMappingByShopifyId } from "../services/mapping.service";
import { resolveShopifyApiVersion } from "../utils/shopify";

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

    const orderIds = result.items
      .map((row) => row.shopify_order_id)
      .filter(Boolean) as string[];
    const overrides = await listOrderInvoiceOverrides(orderIds);
    const einvoiceEnabled = await loadEinvoiceEnabled();

    const items = result.items.map((row) => {
      const shopifyId = row.shopify_order_id ? String(row.shopify_order_id) : "";
      const override = shopifyId ? overrides.get(shopifyId) || null : null;
      const missing = einvoiceEnabled ? validateEinvoiceData(override) : [];
      const alegraStatus =
        row.alegra_status ||
        (row.alegra_invoice_id ? "facturado" : "pendiente");
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
        einvoiceRequested: Boolean(override?.einvoiceRequested),
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
    const shopDomainInput =
      typeof req.body?.shopDomain === "string" ? String(req.body.shopDomain).trim() : "";
    const stream =
      req.query.stream === "1" ||
      req.query.stream === "true" ||
      req.body?.stream === true;
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
      const shopifyCredential = await getShopifyCredential();
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
        const invoiceNumber = mapping?.metadata?.invoiceNumber
          ? String(mapping.metadata.invoiceNumber)
          : null;
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
        const batchLimit =
          limit !== null ? Math.min(pageSize, Math.max(0, limit - processed)) : pageSize;
        if (batchLimit <= 0) break;
        const invoices = (await client.listInvoices({ limit: batchLimit, start })) as Array<Record<
          string,
          unknown
        >>;
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
      const amount =
        Number((results.shopify as any)?.processed || 0) + Number((results.alegra as any)?.processed || 0);
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
    if (req.query.stream === "1" || req.query.stream === "true" || req.body?.stream === true) {
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
