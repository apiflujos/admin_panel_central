import { buildSyncContext } from "./sync-context";
import { acquireIdempotencyKey, markIdempotencyKey } from "./idempotency.service";
import { getMappingByAlegraId, saveMapping } from "./mapping.service";
import { upsertOrder } from "./orders.service";

export type InvoiceToShopifyMode = "draft" | "active";

export type InvoiceToShopifyFilters = {
  dateStart?: string | null;
  dateEnd?: string | null;
  limit?: number | null;
};

type AlegraInvoiceSummary = Record<string, unknown> & {
  id?: string | number;
};

type SyncResult = {
  processed: number;
  total: number;
  created: number;
  skipped: number;
  failed: number;
};

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const parseDateOnly = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const parseTimestamp = (value: unknown) => {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveInvoiceTimestamp = (invoice: Record<string, unknown>) => {
  return (
    parseTimestamp(invoice.datetime) ??
    parseTimestamp(invoice.date) ??
    parseTimestamp(invoice.updated_at) ??
    parseTimestamp(invoice.updatedAt) ??
    parseTimestamp(invoice.created_at) ??
    parseTimestamp(invoice.createdAt) ??
    null
  );
};

const resolveInvoiceNumber = (invoice: Record<string, unknown> | null) => {
  const template = invoice?.numberTemplate as Record<string, unknown> | undefined;
  const full = template?.fullNumber ? String(template.fullNumber) : "";
  const formatted = template?.formattedNumber ? String(template.formattedNumber) : "";
  const prefix = template?.prefix ? String(template.prefix) : "";
  const number = template?.number ? String(template.number) : "";
  if (full) return full;
  if (formatted) return formatted;
  if (prefix && number) return `${prefix}${number}`;
  if (invoice?.number) return String(invoice.number);
  return null;
};

const formatPrice = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toFixed(2);
};

const resolveNumericId = (id: string) => {
  const match = String(id || "").match(/(\d+)(?:\D*)$/);
  return match ? Number(match[1]) : null;
};

const sanitizeTag = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .slice(0, 60);

function normalizeInvoiceItems(invoice: Record<string, unknown>) {
  const candidates = [
    invoice.items,
    invoice.lines,
    invoice.products,
    (invoice as any)?.data?.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [] as Array<Record<string, unknown>>;
}

function buildItemsSummary(items: Array<Record<string, unknown>>) {
  if (!items.length) return "-";
  return items
    .slice(0, 12)
    .map((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
      const name = String(item.name || item.description || item.itemName || "Item");
      return `${qty}x ${name}`;
    })
    .join(", ");
}

async function buildShopifyLineItems(
  items: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  const lineItems: Array<Record<string, unknown>> = [];
  for (const item of items) {
    const quantity = Math.max(1, Math.round(Number(item.quantity ?? item.qty ?? 1) || 1));
    const title = String(item.name || item.description || item.itemName || "Item").trim() || "Item";
    const unitPrice = item.price ?? item.unitPrice ?? item.unit_price ?? item.amount ?? 0;
    const alegraItemId = item.id ? String(item.id) : "";
    if (alegraItemId) {
      const mapping = await getMappingByAlegraId("item", alegraItemId);
      if (mapping?.shopifyId) {
        const numericVariantId = resolveNumericId(mapping.shopifyId);
        if (numericVariantId) {
          lineItems.push({
            variant_id: numericVariantId,
            quantity,
            price: formatPrice(unitPrice),
            title,
          });
          continue;
        }
      }
    }
    lineItems.push({
      title,
      quantity,
      price: formatPrice(unitPrice),
    });
  }
  return lineItems;
}

async function syncSingleInvoice(params: {
  shopDomain?: string;
  alegraInvoiceId: string;
  mode: InvoiceToShopifyMode;
}) {
  const shopDomain = params.shopDomain ? normalizeShopDomain(params.shopDomain) : "";
  const alegraInvoiceId = String(params.alegraInvoiceId || "").trim();
  if (!alegraInvoiceId) {
    return { ok: false, skipped: true, reason: "missing_invoice_id" };
  }

  const existingOrder = await getMappingByAlegraId("order", alegraInvoiceId);
  const existingDraft = await getMappingByAlegraId("draft_order", alegraInvoiceId);
  if (existingOrder?.shopifyId || existingDraft?.shopifyId) {
    return { ok: true, skipped: true, reason: "already_mapped" };
  }

  const idempotencyKey = `alegra_invoice_to_shopify:${shopDomain || "default"}:${alegraInvoiceId}:${params.mode}`;
  const acquired = await acquireIdempotencyKey(idempotencyKey);
  if (!acquired.acquired && acquired.status !== "failed") {
    return { ok: true, skipped: true, reason: `idempotency_${acquired.status}` };
  }

  try {
    const ctx = await buildSyncContext(shopDomain || undefined);
    const invoice = (await ctx.alegra.getInvoice(alegraInvoiceId)) as Record<string, unknown>;
    const invoiceTimestampMs = resolveInvoiceTimestamp(invoice);
    const invoiceTimestampIso = invoiceTimestampMs ? new Date(invoiceTimestampMs).toISOString() : null;
    const items = normalizeInvoiceItems(invoice);
    const invoiceNumber = resolveInvoiceNumber(invoice) || null;
    const invoiceDate = parseDateOnly(String(invoice.date || invoice.datetime || "")) || null;
    const customer = (invoice.client as Record<string, unknown> | undefined) || {};
    const customerEmail = customer.email ? String(customer.email).trim() : "";
    const customerName = customer.name ? String(customer.name).trim() : "";
    const currency = invoice.currency ? String(invoice.currency) : null;
    const totalRaw = invoice.total ?? invoice.totalAmount ?? invoice.total_amount ?? null;
    const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw || 0);
    const tags = [
      "apiflujos",
      `alegra_invoice_id_${sanitizeTag(alegraInvoiceId)}`,
      invoiceNumber ? `alegra_invoice_${sanitizeTag(invoiceNumber)}` : "",
    ].filter(Boolean);
    const lineItems = await buildShopifyLineItems(items);
    const note = [
      "Origen: Alegra",
      `Factura: ${invoiceNumber || alegraInvoiceId}`,
      `Alegra ID: ${alegraInvoiceId}`,
      invoiceDate ? `Fecha: ${invoiceDate}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    let created:
      | { entity: "order"; id: number; name?: string; order_number?: number }
      | { entity: "draft_order"; id: number; name?: string; invoice_url?: string };

    if (params.mode === "active") {
      const payload: Record<string, unknown> = {
        email: customerEmail || undefined,
        tags: tags.join(", "),
        note,
        currency: currency || undefined,
        line_items: lineItems,
        source_name: "Alegra",
      };
      const response = await ctx.shopify.createOrderRest(payload);
      created = { entity: "order", id: response.order.id, name: response.order.name, order_number: response.order.order_number };
      await saveMapping({
        entity: "order",
        alegraId: alegraInvoiceId,
        shopifyId: `gid://shopify/Order/${response.order.id}`,
        metadata: {
          invoiceNumber: invoiceNumber || undefined,
          mode: "active",
          shopDomain: shopDomain || undefined,
        },
      });
      await upsertOrder({
        shopDomain: shopDomain || ctx.shopDomain,
        shopifyId: `gid://shopify/Order/${response.order.id}`,
        alegraId: alegraInvoiceId,
        orderNumber: response.order.name || invoiceNumber || null,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        productsSummary: buildItemsSummary(items),
        processedAt: invoiceTimestampIso || undefined,
        status: "active",
        total: Number.isFinite(total) ? total : null,
        currency: currency || undefined,
        alegraStatus: invoice.status ? String(invoice.status) : "facturado",
        invoiceNumber: invoiceNumber || undefined,
        source: "alegra",
        sourceUpdatedAt: invoiceTimestampIso || undefined,
      });
    } else {
      const payload: Record<string, unknown> = {
        email: customerEmail || undefined,
        tags: tags.join(", "),
        note,
        currency: currency || undefined,
        line_items: lineItems,
      };
      const response = await ctx.shopify.createDraftOrderRest(payload);
      created = { entity: "draft_order", id: response.draft_order.id, name: response.draft_order.name, invoice_url: response.draft_order.invoice_url };
      await saveMapping({
        entity: "draft_order",
        alegraId: alegraInvoiceId,
        shopifyId: `gid://shopify/DraftOrder/${response.draft_order.id}`,
        metadata: {
          invoiceNumber: invoiceNumber || undefined,
          mode: "draft",
          shopDomain: shopDomain || undefined,
          invoiceUrl: response.draft_order.invoice_url || undefined,
        },
      });
      await upsertOrder({
        shopDomain: shopDomain || ctx.shopDomain,
        shopifyId: `gid://shopify/DraftOrder/${response.draft_order.id}`,
        alegraId: alegraInvoiceId,
        orderNumber: invoiceNumber || null,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        productsSummary: buildItemsSummary(items),
        processedAt: invoiceTimestampIso || undefined,
        status: "draft",
        total: Number.isFinite(total) ? total : null,
        currency: currency || undefined,
        alegraStatus: invoice.status ? String(invoice.status) : "facturado",
        invoiceNumber: invoiceNumber || undefined,
        source: "alegra",
        sourceUpdatedAt: invoiceTimestampIso || undefined,
      });
    }

    await markIdempotencyKey(idempotencyKey, "completed");
    return { ok: true, created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    await markIdempotencyKey(idempotencyKey, "failed", message);
    throw error;
  }
}

export async function syncAlegraInvoicesToShopifyOrders(params: {
  shopDomain?: string;
  mode: InvoiceToShopifyMode;
  filters?: InvoiceToShopifyFilters;
  onProgress?: (event: Record<string, unknown>) => void;
}) {
  const ctx = await buildSyncContext(params.shopDomain || undefined);
  const dateStart = parseDateOnly(String(params.filters?.dateStart || "")) || "";
  const dateEnd = parseDateOnly(String(params.filters?.dateEnd || "")) || "";
  const limitRaw = Number(params.filters?.limit || 0);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

  const matchesDate = (invoice: Record<string, unknown>) => {
    if (!dateStart && !dateEnd) return true;
    const invoiceDate = parseDateOnly(String(invoice.date || invoice.datetime || "")) || "";
    if (!invoiceDate) return false;
    if (dateStart && invoiceDate < dateStart) return false;
    if (dateEnd && invoiceDate > dateEnd) return false;
    return true;
  };

  const candidates: AlegraInvoiceSummary[] = [];
  let start = 0;
  const pageSize = 30;
  let pages = 0;
  while (candidates.length < limit) {
    const batch = (await ctx.alegra.listInvoices({ limit: pageSize, start })) as unknown;
    const invoices = Array.isArray(batch) ? (batch as AlegraInvoiceSummary[]) : [];
    if (!invoices.length) break;
    pages += 1;
    for (const invoice of invoices) {
      if (!matchesDate(invoice)) continue;
      if (!invoice.id) continue;
      candidates.push(invoice);
      if (candidates.length >= limit) break;
    }
    start += invoices.length;
    if (invoices.length < pageSize) break;
  }

  const total = candidates.length;
  const result: SyncResult = { processed: 0, total, created: 0, skipped: 0, failed: 0 };
  params.onProgress?.({ type: "start", total, pages });

  const step = Math.max(1, Math.ceil(total / 25));
  for (const invoice of candidates) {
    result.processed += 1;
    const invoiceId = invoice.id ? String(invoice.id) : "";
    try {
      const r = await syncSingleInvoice({
        shopDomain: params.shopDomain,
        alegraInvoiceId: invoiceId,
        mode: params.mode,
      });
      if (r.skipped) result.skipped += 1;
      else if (r.created) result.created += 1;
    } catch {
      result.failed += 1;
    }
    if (result.processed % step === 0 || result.processed === total) {
      params.onProgress?.({
        type: "progress",
        processed: result.processed,
        total,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
      });
    }
  }

  params.onProgress?.({ type: "complete", ...result });
  return result;
}

export async function syncAlegraInvoiceToShopifyFromWebhook(params: {
  shopDomain?: string;
  alegraInvoiceId: string;
  mode: InvoiceToShopifyMode;
}) {
  return syncSingleInvoice(params);
}
