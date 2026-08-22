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
import { reactivarPedidoDescartado } from "./shopify-to-alegra.service";

export async function listOperations(days = 7) {
  const updatedAtMin = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const query = `status:any updated_at:>='${updatedAtMin}'`;
  return listOperationsByQuery(query);
}

export async function listOperationsRange(from: Date, to: Date) {
  const updatedAtMin = from.toISOString();
  const updatedAtMax = to.toISOString();
  const query = `status:any updated_at:>='${updatedAtMin}' updated_at:<='${updatedAtMax}'`;
  return listOperationsByQuery(query);
}

// Tiendas Shopify activas de la org (con credenciales), con su nombre legible.
// Se usa para listar operaciones de TODAS las tiendas y etiquetar cada pedido con
// la suya (Becam / Belia). Antes se usaba un solo cliente por defecto, así que los
// pedidos de la otra tienda no aparecían y ninguno quedaba marcado con su tienda.
async function listActiveShopifyStoresForOps(): Promise<Array<{ shopDomain: string; storeName: string | null }>> {
  const pool = getPool();
  const orgId = getOrgId();
  const res = await pool.query<{ shop_domain: string; name: string | null }>(
    `
    SELECT ss.shop_domain,
           COALESCE(NULLIF(s.name, ''), NULLIF(ss.store_name, ''), ss.shop_domain) AS name
    FROM shopify_stores ss
    LEFT JOIN stores s ON s.id = ss.store_id AND s.organization_id = ss.organization_id
    WHERE ss.organization_id = $1 AND ss.access_token_encrypted IS NOT NULL
    ORDER BY ss.store_id ASC NULLS LAST, ss.id ASC
    `,
    [orgId]
  );
  return res.rows
    .filter((row) => row.shop_domain)
    .map((row) => ({ shopDomain: String(row.shop_domain), storeName: row.name ? String(row.name) : null }));
}

async function listOperationsByQuery(query: string) {
  const stores = await listActiveShopifyStoresForOps();
  // Si no hay tiendas registradas con credenciales, se conserva el comportamiento
  // anterior (cliente por defecto) para no romper setups de una sola tienda.
  const storeList = stores.length ? stores : [{ shopDomain: "", storeName: null }];

  // Multi-tienda: se consulta el Shopify de CADA tienda y se etiqueta cada pedido
  // con la suya. Una tienda sin credenciales no debe tumbar la lista de la otra.
  const tagged: Array<{ order: ShopifyOrder; shopDomain: string; storeName: string | null }> = [];
  await Promise.all(
    storeList.map(async (store) => {
      try {
        const ctx = await buildSyncContext(store.shopDomain || undefined);
        const orders = await ctx.shopify.listAllOrdersByQuery(query);
        for (const order of orders) {
          tagged.push({
            order,
            shopDomain: store.shopDomain || ctx.shopDomain || "",
            storeName: store.storeName,
          });
        }
      } catch (error) {
        console.warn(
          `[operations] no se pudieron listar pedidos de ${store.shopDomain || "(default)"}: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    })
  );

  const orderIds = tagged.map((entry) => entry.order.id);
  const latestLogs = await listLatestOrderLogs(orderIds);
  const overrides = await listOrderInvoiceOverrides(orderIds);
  const invoiceSettings = await loadInvoiceSettings();
  const einvoiceEnabled = invoiceSettings.einvoiceEnabled;

  const items = await Promise.all(
    tagged.map(async ({ order, shopDomain, storeName }) => {
      const mapping = await getMappingByShopifyId("order", order.id);
      const log = latestLogs.get(order.id);
      const invoiceNumber = (mapping?.metadata?.invoiceNumber as string | undefined) || null;
      const status = mapping?.alegraId ? "facturado" : log?.status === "fail" ? "fallo" : "pendiente";
      const override = overrides.get(order.id) || null;
      const missing = einvoiceEnabled ? validateEinvoiceData(override) : [];
      const actionability = buildOperationActionability({
        orderId: order.id,
        invoiceId: mapping?.alegraId ? String(mapping.alegraId) : null,
        alegraStatus: status,
        einvoiceEnabled,
        einvoiceRequested: Boolean(override?.einvoiceRequested),
        einvoiceMissing: missing,
        paymentEnabled: invoiceSettings.applyPayment,
        hasBankAccount: Boolean(invoiceSettings.bankAccountId),
      });
      return {
        id: order.id,
        shopDomain,
        storeName,
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
        actionability,
      };
    })
  );

  return { items };
}

// Resuelve el dominio Shopify de un pedido ya guardado (para usar la tienda y
// cuenta Alegra correctas en entornos multi-tienda).
async function resolveOrderShopDomain(orderId: string): Promise<string | undefined> {
  const pool = getPool();
  const orgId = getOrgId();
  const res = await pool.query<{ shop_domain: string | null }>(
    `SELECT shop_domain FROM orders WHERE organization_id = $1 AND shopify_order_id = $2 LIMIT 1`,
    [orgId, orderId]
  );
  const domain = res.rows[0]?.shop_domain;
  return domain ? String(domain) : undefined;
}

export async function syncOperation(
  orderId: string,
  options?: { generateInvoice?: boolean; skipRules?: boolean; forceEinvoice?: boolean }
) {
  const shopDomain = await resolveOrderShopDomain(orderId);
  const ctx = await buildSyncContext(shopDomain);
  const data = await ctx.shopify.getOrderById(orderId);
  const order = data.order as ShopifyOrder;
  if (!order) {
    return { status: "not_found" };
  }

  const payload = mapOrderToPayload(order);
  // Un reintento manual SIEMPRE vuelve a intentar, aunque el pedido estuviera
  // descartado por falta de datos: si alguien pulsa "reintentar" es porque ya
  // completó lo que faltaba.
  await reactivarPedidoDescartado(String(orderId)).catch(() => undefined);
  const hasOptions =
    options &&
    (options.generateInvoice !== undefined || options.skipRules !== undefined || options.forceEinvoice !== undefined);
  const result = await syncShopifyOrderToAlegra(
    {
      ...(payload as Record<string, unknown>),
      __shopDomain: ctx.shopDomain,
    },
    hasOptions
      ? {
          forceSync: true,
          generateInvoice: options?.generateInvoice,
          skipRules: options?.skipRules,
          forceEinvoice: options?.forceEinvoice,
        }
      : { forceSync: true }
  );
  return { status: "synced", result };
}

export async function retryInvoiceFromLog(orderId: string) {
  // Resuelve el dominio de la tienda del pedido para usar las credenciales Shopify
  // correctas. Sin esto, buildSyncContext() cae al credential legacy `shopify`
  // (que NO existe en setups multi-tienda con shopify_stores) y lanza
  // "Missing Shopify credentials in DB", disparando reintentos infinitos.
  const shopDomain = await resolveOrderShopDomain(orderId);
  const ctx = await buildSyncContext(shopDomain);
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
  const result = await pool.query<{
    einvoice_enabled: boolean | null;
    apply_payment: boolean | null;
    bank_account_id: string | null;
  }>(
    `
    SELECT einvoice_enabled, apply_payment, bank_account_id
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return { einvoiceEnabled: false, applyPayment: false, bankAccountId: "" };
  }
  return {
    einvoiceEnabled: Boolean(result.rows[0].einvoice_enabled),
    applyPayment: Boolean(result.rows[0].apply_payment),
    bankAccountId: result.rows[0].bank_account_id || "",
  };
}

function buildOperationActionability(params: {
  orderId: string;
  invoiceId: string | null;
  alegraStatus: string;
  einvoiceEnabled: boolean;
  einvoiceRequested: boolean;
  einvoiceMissing: string[];
  paymentEnabled: boolean;
  hasBankAccount: boolean;
}) {
  const {
    orderId,
    invoiceId,
    alegraStatus,
    einvoiceEnabled,
    einvoiceRequested,
    einvoiceMissing,
    paymentEnabled,
    hasBankAccount,
  } = params;
  const hasOrderId = Boolean(orderId);
  const isInvoiced = alegraStatus === "facturado";
  const hasInvoice = Boolean(invoiceId);
  const missingEinvoiceData = einvoiceEnabled && einvoiceRequested && einvoiceMissing.length > 0;

  return {
    sync: hasOrderId ? { enabled: true as const } : { enabled: false as const, reason: "Sin identificador de pedido." },
    retryInvoice: !hasOrderId
      ? { enabled: false as const, reason: "Sin identificador de pedido." }
      : isInvoiced || hasInvoice
        ? { enabled: false as const, reason: "La operación ya está facturada." }
        : missingEinvoiceData
          ? { enabled: false as const, reason: "Faltan datos de e-factura para facturar." }
          : { enabled: true as const },
    payment: !hasInvoice
      ? { enabled: false as const, reason: "La operación no tiene factura asociada." }
      : !paymentEnabled
        ? { enabled: false as const, reason: "Apply payment está apagado." }
        : !hasBankAccount
          ? { enabled: false as const, reason: "Falta cuenta bancaria en configuración." }
          : isInvoiced
            ? { enabled: true as const }
            : { enabled: false as const, reason: "La factura aún no está en estado facturado." },
    cancel: !hasInvoice
      ? { enabled: false as const, reason: "La operación no tiene factura asociada." }
      : isInvoiced
        ? { enabled: true as const }
        : { enabled: false as const, reason: "Solo se puede anular una factura activa." },
    editEinvoice: hasOrderId
      ? { enabled: true as const }
      : { enabled: false as const, reason: "Sin identificador de pedido." },
    pdf: hasInvoice
      ? { enabled: true as const, invoiceId }
      : { enabled: false as const, reason: "Sin factura asociada.", invoiceId: null },
  };
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
  const orders = await ctx.shopify.listOrdersUpdatedSince(updatedAtMin);
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
        const result = await syncShopifyOrderToAlegra({
          ...(payload as Record<string, unknown>),
          __shopDomain: ctx.shopDomain,
        });
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
    fulfillment_status: order.displayFulfillmentStatus || undefined,
    payment_gateway_names: Array.isArray(order.paymentGatewayNames)
      ? order.paymentGatewayNames.filter(Boolean)
      : undefined,
    // Etiquetas del pedido (puede traer el medio de pago: crediplatam, etc.).
    tags: Array.isArray(order.tags) ? order.tags.filter(Boolean).join(", ") : undefined,
    // IMPRESCINDIBLE para el cálculo del IVA: sin esto buildInvoicePayload cree
    // que el precio NO trae IVA y Alegra lo suma otra vez (doble IVA). Becam
    // maneja precios con IVA incluido (taxes_included=true).
    taxes_included: order.taxesIncluded ?? true,
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
                // Cédula del cliente (Becam la recoge en `company` del checkout).
                company: order.shippingAddress.company || undefined,
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
    shipping_lines: order.shippingLine?.originalPriceSet?.shopMoney?.amount
      ? [
          {
            title: order.shippingLine.title || "Envío",
            price: order.shippingLine.originalPriceSet.shopMoney.amount,
          },
        ]
      : [],
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

/**
 * Predicate puro: dada una invoice Alegra y datos del cliente Shopify (email, phone),
 * indica si corresponden al mismo cliente en la MISMA fecha. Extraído para testabilidad.
 *
 * Match estricto: identification === phone (no substring — evita colisiones entre
 * documentos que se contienen mutuamente).
 */
export function invoiceMatchesShopifyCustomer(
  invoice: Record<string, unknown>,
  target: { targetDate: string; email: string; phone: string }
): { matches: boolean; onSameDate: boolean } {
  const date = String(invoice.date || invoice.datetime || "").slice(0, 10);
  const onSameDate = date === target.targetDate;
  if (!onSameDate) return { matches: false, onSameDate };
  const client = invoice.client as Record<string, unknown> | undefined;
  const clientEmail = client?.email ? String(client.email) : "";
  const clientIdentification = client?.identification ? String(client.identification).replace(/\D/g, "") : "";
  const byEmail =
    Boolean(target.email) && Boolean(clientEmail) && target.email.toLowerCase() === clientEmail.toLowerCase();
  const byPhone = Boolean(target.phone) && clientIdentification === target.phone;
  return { matches: byEmail || byPhone, onSameDate };
}

async function invoiceExistsInAlegra(ctx: Awaited<ReturnType<typeof buildSyncContext>>, order: ShopifyOrder) {
  const targetDate = String(order.processedAt || "").slice(0, 10);
  if (!targetDate) return false;
  const email = order.email || order.customer?.email || "";
  const phone = String(order.customer?.phone || "").replace(/\D/g, "");
  const maxPages = 20;
  const pageSize = 30;
  for (let page = 0; page < maxPages; page += 1) {
    const invoices = await ctx.alegra.listInvoices({ limit: pageSize, start: page * pageSize });
    if (!Array.isArray(invoices) || !invoices.length) {
      break;
    }
    let allOlder = true;
    const match = invoices.find((invoice: Record<string, unknown>) => {
      const result = invoiceMatchesShopifyCustomer(invoice, { targetDate, email, phone });
      if (result.onSameDate || String(invoice.date || invoice.datetime || "").slice(0, 10) > targetDate) {
        allOlder = false;
      }
      return result.matches;
    });
    if (match) return true;
    if (allOlder) break;
    if (invoices.length < pageSize) break;
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
