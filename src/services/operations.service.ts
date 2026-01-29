import { buildSyncContext } from "./sync-context";
import { syncShopifyOrderToAlegra } from "./shopify-to-alegra.service";
import { getMappingByShopifyId, saveMapping } from "./mapping.service";
import { listLatestOrderLogs, getLatestInvoicePayload } from "./logs.service";
import { createSyncLog } from "./logs.service";
import { acquireIdempotencyKey, markIdempotencyKey } from "./idempotency.service";
import {
  getOrderInvoiceOverride,
  listOrderInvoiceOverrides,
  validateEinvoiceData,
  OrderInvoiceOverride,
} from "./order-invoice-overrides.service";
import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../db";
import { ShopifyOrder } from "../connectors/shopify";

export async function listOperations(days = 7) {
  const ctx = await buildSyncContext();
  const updatedAtMin = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const query = `status:any updated_at:>='${updatedAtMin}'`;
  const orders = await ctx.shopify.listAllOrdersByQuery(query);
  const orderIds = orders.map((order) => order.id);
  const latestLogs = await listLatestOrderLogs(orderIds);
  const overrides = await listOrderInvoiceOverrides(orderIds);
  const invoiceSettings = await loadInvoiceSettings();
  const einvoiceEnabled = invoiceSettings.einvoiceEnabled;

  const items = await Promise.all(
    orders.map(async (order) => {
      const mapping = await getMappingByShopifyId("order", order.id);
      const log = latestLogs.get(order.id);
      const invoiceNumber =
        (mapping?.metadata?.invoiceNumber as string | undefined) || null;
      const status = mapping?.alegraId
        ? "facturado"
        : log?.status === "fail"
        ? "fallo"
        : "pendiente";
      const override = overrides.get(order.id) || null;
      const missing = einvoiceEnabled ? validateEinvoiceData(override) : [];
      return {
        id: order.id,
        orderNumber: order.name,
        processedAt: order.processedAt,
        customer: buildCustomerName(order),
        customerEmail: order.email,
        products: buildProductsSummary(order),
        alegraStatus: status,
        invoiceId: mapping?.alegraId || null,
        invoiceNumber,
        errorMessage: log?.status === "fail" ? log.message || null : null,
        einvoiceRequested: Boolean(override?.einvoiceRequested),
        einvoiceMissing: missing,
      };
    })
  );

  return { items };
}

export async function syncOperation(orderId: string) {
  const ctx = await buildSyncContext();
  const data = await ctx.shopify.getOrderById(orderId);
  const order = data.order as ShopifyOrder;
  if (!order) {
    return { status: "not_found" };
  }

  const payload = mapOrderToPayload(order);
  const result = await syncShopifyOrderToAlegra(payload);
  return { status: "synced", result };
}

export async function retryInvoiceFromLog(orderId: string) {
  const ctx = await buildSyncContext();
  const existing = await getMappingByShopifyId("order", orderId);
  if (existing?.alegraId) {
    await markIdempotencyKey(`invoice:${orderId}`, "completed");
    return { status: "already_invoiced", invoiceId: existing.alegraId };
  }
  const invoicePayload = await getLatestInvoicePayload(orderId);
  if (!invoicePayload) {
    return { status: "missing_payload" };
  }
  const invoiceSettings = await loadInvoiceSettings();
  const override = await getOrderInvoiceOverride(orderId);
  if (invoiceSettings.einvoiceEnabled && override?.einvoiceRequested) {
    const missing = validateEinvoiceData(override);
    if (missing.length) {
      await createSyncLog({
        entity: "order",
        direction: "shopify->alegra",
        status: "fail",
        message: "Missing e-invoice data",
        request: { orderId, missing },
      });
      return { status: "missing_einvoice_data", missing };
    }
    const contactId = resolveContactId(invoicePayload);
    if (contactId) {
      await ctx.alegra.updateContact(contactId, buildContactOverride(override));
    }
  }
  const idempotency = await acquireIdempotencyKey(`invoice:${orderId}`);
  if (!idempotency.acquired) {
    return {
      status: idempotency.status === "completed" ? "already_completed" : "already_processing",
    };
  }
  try {
    const invoice = await ctx.alegra.createInvoice(invoicePayload);
    const invoiceId = invoice?.id ? String(invoice.id) : undefined;
    const invoiceNumber = resolveInvoiceNumber(invoice);
    if (invoiceId) {
      await saveMapping({
        entity: "order",
        shopifyId: orderId,
        alegraId: invoiceId,
        metadata: invoiceNumber ? { invoiceNumber } : undefined,
      });
    }
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "success",
      message: "Manual invoice created",
      request: { orderId, invoicePayload },
      response: { invoiceId, invoiceNumber },
    });
    await markIdempotencyKey(`invoice:${orderId}`, "completed");
    return { status: "created", invoiceId, invoiceNumber };
  } catch (error) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: (error as { message?: string })?.message || "Manual invoice failed",
      request: { orderId, invoicePayload },
    });
    await markIdempotencyKey(
      `invoice:${orderId}`,
      "failed",
      (error as { message?: string })?.message || "Manual invoice failed"
    );
    throw error;
  }
}

async function loadInvoiceSettings() {
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
    return { einvoiceEnabled: false };
  }
  return { einvoiceEnabled: Boolean(result.rows[0].einvoice_enabled) };
}

function resolveContactId(invoicePayload: Record<string, unknown>) {
  const raw = invoicePayload?.client as unknown;
  if (typeof raw === "number" || typeof raw === "string") return String(raw);
  if (raw && typeof raw === "object") {
    const id = (raw as { id?: string | number }).id;
    if (id) return String(id);
  }
  return null;
}

function buildContactOverride(override: OrderInvoiceOverride) {
  return {
    name: override.fiscalName,
    email: override.email,
    phonePrimary: override.phone,
    address: override.address,
    city: override.city,
    department: override.state,
    country: override.country,
    postalCode: override.zip,
    identificationType: override.idType,
    identification: override.idNumber,
  };
}

export async function seedOperations() {
  const ctx = await buildSyncContext();
  const updatedAtMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = await ctx.shopify.listOrdersUpdatedSince(updatedAtMin);
  const orders = result.orders?.edges?.map((edge) => edge.node) || [];
  const eligible = orders
    .filter((order) => String(order.displayFinancialStatus || "").toUpperCase() === "PAID")
    .sort((a, b) => String(b.processedAt || "").localeCompare(String(a.processedAt || "")));

  const batches = chunkArray(eligible, 5);
  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(async (order) => {
        const mapping = await getMappingByShopifyId("order", order.id);
        if (mapping?.alegraId) {
          return { orderId: order.id, status: "skipped_mapping" };
        }
        const exists = await invoiceExistsInAlegra(ctx, order);
        if (exists) {
          return { orderId: order.id, status: "skipped_duplicate" };
        }
        const payload = mapOrderToPayload(order);
        const result = await syncShopifyOrderToAlegra(payload);
        return { orderId: order.id, status: "synced", result };
      })
    );
    results.push(...batchResults);
  }
  return { processed: results.length, results };
}

export function mapOrderToPayload(order: ShopifyOrder) {
  return {
    id: order.id,
    name: order.name,
    email: order.email || undefined,
    financial_status: order.displayFinancialStatus || undefined,
    total_price: order.totalPriceSet?.shopMoney?.amount || "0",
    currency: order.totalPriceSet?.shopMoney?.currencyCode || "COP",
    customer: order.customer
      ? {
          first_name: order.customer.firstName || undefined,
          last_name: order.customer.lastName || undefined,
          email: order.customer.email || undefined,
          phone: order.customer.phone || undefined,
          default_address: order.shippingAddress
            ? {
                address1: order.shippingAddress.address1 || undefined,
                city: order.shippingAddress.city || undefined,
                province: order.shippingAddress.province || undefined,
                zip: order.shippingAddress.zip || undefined,
                country_code: order.shippingAddress.countryCodeV2 || undefined,
              }
            : undefined,
        }
      : undefined,
    line_items: (order.lineItems?.edges || []).map((edge) => ({
      variant_id: edge.node.variant?.id || undefined,
      quantity: edge.node.quantity,
      sku: edge.node.variant?.sku || undefined,
      price: edge.node.originalUnitPriceSet?.shopMoney?.amount || "0",
      discounted_price: edge.node.discountedUnitPriceSet?.shopMoney?.amount || undefined,
      title: edge.node.title,
    })),
  };
}

function buildCustomerName(order: ShopifyOrder) {
  const first = order.customer?.firstName || "";
  const last = order.customer?.lastName || "";
  const name = `${first} ${last}`.trim();
  return name || order.email || "Cliente";
}

function buildProductsSummary(order: ShopifyOrder) {
  const items = order.lineItems?.edges || [];
  if (!items.length) return "-";
  return items
    .map((edge) => {
      const qty = edge.node.quantity || 0;
      const title = edge.node.title || "Item";
      return `${qty}x ${title}`;
    })
    .join(", ");
}

function resolveInvoiceNumber(invoice: Record<string, unknown> | null) {
  const template = invoice?.numberTemplate as Record<string, unknown> | undefined;
  const full = template?.fullNumber ? String(template.fullNumber) : "";
  const formatted = template?.formattedNumber ? String(template.formattedNumber) : "";
  const prefix = template?.prefix ? String(template.prefix) : "";
  const number = template?.number ? String(template.number) : "";
  if (full) return full;
  if (formatted) return formatted;
  if (prefix && number) return `${prefix}${number}`;
  return null;
}

async function invoiceExistsInAlegra(ctx: Awaited<ReturnType<typeof buildSyncContext>>, order: ShopifyOrder) {
  const targetDate = String(order.processedAt || "").slice(0, 10);
  if (!targetDate) return false;
  const email = order.email || order.customer?.email || "";
  const phone = String(order.customer?.phone || "").replace(/\\D/g, "");
  const maxPages = 5;
  const pageSize = 30;
  for (let page = 0; page < maxPages; page += 1) {
    const invoices = await ctx.alegra.listInvoices({ limit: pageSize, start: page * pageSize });
    if (!Array.isArray(invoices) || !invoices.length) {
      break;
    }
    const match = invoices.find((invoice: Record<string, unknown>) => {
      const date = String(invoice.date || invoice.datetime || "").slice(0, 10);
      if (date !== targetDate) return false;
      const client = invoice.client as Record<string, unknown> | undefined;
      const clientEmail = client?.email ? String(client.email) : "";
      const clientId = client?.identification ? String(client.identification) : "";
      const byEmail = email && clientEmail && email.toLowerCase() === clientEmail.toLowerCase();
      const byPhone = phone && clientId && clientId.includes(phone);
      return byEmail || byPhone;
    });
    if (match) {
      return true;
    }
    if (invoices.length < pageSize) {
      break;
    }
  }
  return false;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: Array<T[]> = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
