import { buildSyncContext } from "./sync-context";
import { getMappingByShopifyId, saveMapping, updateMappingMetadata } from "./mapping.service";
import { upsertContact } from "./contacts.service";
import { upsertOrder } from "./orders.service";
import { createSyncLog } from "./logs.service";
import { acquireIdempotencyKey, markIdempotencyKey } from "./idempotency.service";
import { getOrderInvoiceOverride, validateEinvoiceData } from "./order-invoice-overrides.service";
import { resolveStoreConfig } from "./store-config.service";
import { getStoreConfigForDomain } from "./store-configs.service";
import type { Pool } from "pg";

type ShopifyOrderPayload = {
  id?: number | string;
  name?: string;
  email?: string;
  total_price?: string;
  currency?: string;
  processed_at?: string;
  processedAt?: string;
  created_at?: string;
  createdAt?: string;
  __shopDomain?: string;
  payment_gateway_names?: string[];
  gateway?: string;
  customer?: {
    id?: number | string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    default_address?: {
      address1?: string;
      city?: string;
      province?: string;
      zip?: string;
      country_code?: string;
    };
  };
  line_items?: Array<{
    sku?: string;
    quantity?: number;
    price?: string;
    discounted_price?: string;
    title?: string;
    variant_id?: number | string;
  }>;
  financial_status?: string;
};

type ForceSyncOptions = {
  generateInvoice?: boolean;
  skipRules?: boolean;
};

export async function syncShopifyOrderToAlegra(
  payload: ShopifyOrderPayload,
  options?: ForceSyncOptions
) {
  const ctx = await buildSyncContext(payload.__shopDomain);
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();
  const orderId = extractOrderId(payload);
  const shopDomain = payload.__shopDomain || "";

  const customerEmail = payload.customer?.email || payload.email;

  const orderGid = orderId ? toOrderGid(orderId) : undefined;
  let invoiceSettings = await loadInvoiceSettings(pool, orgId);
  const storeConfig = await resolveStoreConfig(shopDomain);
  const storeConfigFull = shopDomain ? await getStoreConfigForDomain(shopDomain) : null;
  if (storeConfigFull?.invoice) {
    invoiceSettings = { ...invoiceSettings, ...storeConfigFull.invoice };
  }
  const orderMode = storeConfig.syncOrdersShopifyToAlegra || "invoice";
  if (orderMode === "off") {
    return { handled: false, reason: "sync_disabled" };
  }
  if (orderMode === "db_only") {
    const orderMeta = buildOrderMetaFromPayload(payload);
    await upsertContact({
      shopDomain,
      shopifyId: payload.customer?.id ? String(payload.customer.id) : undefined,
      name: orderMeta.customerName,
      email: orderMeta.customerEmail || undefined,
      phone: payload.customer?.phone || undefined,
      address: payload.customer?.default_address?.address1 || undefined,
      source: "shopify",
    });
    if (orderId) {
      await upsertOrder({
        shopDomain,
        shopifyId: orderId,
        orderNumber: orderMeta.orderNumber,
        customerName: orderMeta.customerName,
        customerEmail: orderMeta.customerEmail,
        productsSummary: orderMeta.productsSummary,
        processedAt: orderMeta.processedAt,
        status: payload.financial_status || undefined,
        total: payload.total_price ? Number(payload.total_price) : null,
        currency: payload.currency || undefined,
        alegraStatus: "pendiente",
        sourceUpdatedAt: orderMeta.processedAt,
        source: "shopify",
      });
    }
    return { handled: true, dbOnly: true };
  }
  if (options?.skipRules) {
    storeConfig.transferEnabled = false;
  }
  if (typeof options?.generateInvoice === "boolean") {
    invoiceSettings.generateInvoice = options.generateInvoice;
  } else {
    const allowInvoice = invoiceSettings.generateInvoice !== false;
    invoiceSettings.generateInvoice = orderMode === "invoice" ? allowInvoice : false;
  }

  const missing = buildOrderChecklist(payload, {
    requireInvoice: Boolean(invoiceSettings.generateInvoice),
  });
  if (missing.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing required order fields",
      request: { orderId: orderId || null, missing },
    });
    return { handled: false, reason: "missing_order_fields", missing };
  }

  const invoiceChecklist = buildInvoiceSettingsChecklist(invoiceSettings);
  if (invoiceChecklist.blocking.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing invoice settings",
      request: { orderId: orderId || null, missing: invoiceChecklist.blocking },
    });
    return { handled: false, reason: "missing_invoice_settings", missing: invoiceChecklist.blocking };
  }
  if (invoiceChecklist.warnings.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "warn",
      message: "Invoice settings incomplete",
      request: { orderId: orderId || null, warnings: invoiceChecklist.warnings },
    });
  }
  const transferResult = await createInventoryTransferFromOrder(
    payload,
    storeConfig,
    ctx,
    pool,
    orgId,
    orderId,
    shopDomain
  );
  if (transferResult && transferResult.blocked) {
    const orderTagId = orderId ? toOrderGid(String(orderId)) : undefined;
    if (orderTagId) {
      try {
        await ctx.shopify.addOrderTag(orderTagId, "Sync_Error_Inventario");
      } catch {
        // ignore tag failures
      }
    }
    return { handled: false, reason: transferResult.reason, transfer: transferResult };
  }
  const resolvedWarehouseId = resolveInvoiceWarehouseId(storeConfig, transferResult, invoiceSettings);
  const effectiveInvoiceSettings = resolvedWarehouseId
    ? { ...invoiceSettings, warehouseId: resolvedWarehouseId }
    : invoiceSettings;
  const invoiceWarnings = buildInvoiceSettingsWarnings(effectiveInvoiceSettings);
  if (invoiceWarnings.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "warn",
      message: "Invoice settings missing warehouse",
      request: { orderId: orderId || null, warnings: invoiceWarnings },
    });
  }
  const override = orderId ? await getOrderInvoiceOverride(orderId) : null;
  const einvoiceActive = Boolean(effectiveInvoiceSettings.einvoiceEnabled && override?.einvoiceRequested);
  const missingEinvoice = einvoiceActive ? validateEinvoiceData(override) : [];
  if (missingEinvoice.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing e-invoice data",
      request: { orderId, missing: missingEinvoice },
    });
    return { handled: false, reason: "missing_einvoice_data", missing: missingEinvoice };
  }
  const effectiveEmail = einvoiceActive && override?.email ? override.email : customerEmail;
  if (!effectiveEmail) {
    return { handled: false, reason: "missing_customer_email" };
  }
  const existingMapping = orderId
    ? (await getMappingByShopifyId("order", orderId)) ||
      (orderGid ? await getMappingByShopifyId("order", orderGid) : undefined)
    : undefined;
  const existing = (await ctx.alegra.findContactByEmail(effectiveEmail)) as Array<{
    id: string | number;
  }>;

  const address = payload.customer?.default_address;
  const contactName = einvoiceActive && override?.fiscalName ? override.fiscalName : buildContactName(payload);
  const contactPayload = {
    name: contactName,
    email: effectiveEmail,
    phonePrimary: (einvoiceActive ? override?.phone : payload.customer?.phone) || undefined,
    address: (einvoiceActive ? override?.address : address?.address1) || undefined,
    city: (einvoiceActive ? override?.city : address?.city) || undefined,
    department: einvoiceActive ? override?.state : undefined,
    country: einvoiceActive ? override?.country : undefined,
    postalCode: einvoiceActive ? override?.zip : undefined,
  };
  const rawPhone = payload.customer?.phone || "";
  const phoneId = rawPhone.replace(/\D/g, "");
  const identification =
    einvoiceActive && override?.idNumber
      ? override.idNumber
      : phoneId.startsWith("57") && phoneId.length > 10
      ? phoneId.slice(2)
      : phoneId || "3000000000";
  const createContactPayload = {
    ...contactPayload,
    identificationType: einvoiceActive && override?.idType ? override.idType : "CC",
    identification,
  };

  let contactId: string;
  if (existing && existing.length > 0) {
    contactId = String(existing[0].id);
    try {
      await ctx.alegra.updateContact(contactId, createContactPayload);
    } catch (error) {
      const message = (error as { message?: string })?.message || "Contact update failed";
      if (message.includes("2035") || message.toLowerCase().includes("identificaci")) {
        await createSyncLog({
          entity: "order",
          direction: "shopify->alegra",
          status: "fail",
          message: "Missing identification type",
          request: { orderId, contactId },
        });
        return { handled: false, reason: "missing_identification_type" };
      }
      throw error;
    }
  } else {
    try {
      const created = (await ctx.alegra.createContact(createContactPayload)) as { id: string };
      contactId = String(created.id);
    } catch (error) {
      const message = (error as { message?: string })?.message || "Contact creation failed";
      if (message.includes("2035") || message.toLowerCase().includes("identificaci")) {
        await createSyncLog({
          entity: "order",
          direction: "shopify->alegra",
          status: "fail",
          message: "Missing identification type",
          request: { orderId },
        });
        return { handled: false, reason: "missing_identification_type" };
      }
      throw error;
    }
  }

  await upsertContact({
    shopDomain,
    shopifyId: payload.customer?.id ? String(payload.customer.id) : undefined,
    alegraId: contactId,
    name: contactName,
    email: effectiveEmail,
    phone: contactPayload.phonePrimary || undefined,
    doc: identification,
    address: contactPayload.address || undefined,
    source: "shopify",
  });

  const paymentGateways = extractPaymentGateways(payload);
  const defaultBankAccountId = await resolveBankAccountId(
    pool,
    orgId,
    invoiceSettings.paymentMethod,
    invoiceSettings.bankAccountId
  );
  const sourceMapping = await resolvePaymentMappingBySource(pool, orgId, paymentGateways);
  const paymentMethod = sourceMapping?.paymentMethod || invoiceSettings.paymentMethod;
  const bankAccountId = sourceMapping?.accountId || defaultBankAccountId;
  const invoicePayload = buildInvoicePayload(payload, contactId, effectiveInvoiceSettings, paymentMethod);
  if (!invoiceSettings.generateInvoice) {
    if (orderId) {
      const orderMeta = buildOrderMetaFromPayload(payload);
      await upsertOrder({
        shopDomain,
        shopifyId: orderId,
        orderNumber: orderMeta.orderNumber,
        customerName: orderMeta.customerName,
        customerEmail: orderMeta.customerEmail,
        productsSummary: orderMeta.productsSummary,
        processedAt: orderMeta.processedAt,
        status: payload.financial_status || undefined,
        total: payload.total_price ? Number(payload.total_price) : null,
        currency: payload.currency || undefined,
        alegraStatus: "pendiente",
        sourceUpdatedAt: orderMeta.processedAt,
        source: "shopify",
      });
    }
    return { handled: true, contactId, invoice: null, payment: null, adjustment: null };
  }

  let invoice = null;
  let invoiceId = existingMapping?.alegraId;
  const idempotencyKey = orderId ? `invoice:${orderId}` : undefined;
  if (invoiceId && idempotencyKey) {
    await markIdempotencyKey(idempotencyKey, "completed");
  }
  if (!invoiceId && idempotencyKey) {
    const idempotency = await acquireIdempotencyKey(idempotencyKey);
    if (!idempotency.acquired) {
      return {
        handled: true,
        contactId,
        invoice: null,
        payment: null,
        adjustment: null,
        skipped: idempotency.status === "completed" ? "already_completed" : "already_processing",
      };
    }
  }
  if (!invoiceId) {
    try {
      invoice = await ctx.alegra.createInvoice(invoicePayload);
    } catch (error) {
      await safeCreateInvoiceLog(orderId, invoicePayload, "fail", error);
      if (idempotencyKey) {
        await markIdempotencyKey(
          idempotencyKey,
          "failed",
          (error as { message?: string })?.message || "Invoice creation failed"
        );
      }
      throw error;
    }
    invoiceId = invoice?.id ? String(invoice.id) : undefined;
    await safeCreateInvoiceLog(orderId, invoicePayload, "success", null, invoice);
    if (orderId && invoiceId) {
      const invoiceNumber = resolveInvoiceNumber(invoice);
      await saveMapping({
        entity: "order",
        shopifyId: orderId,
        alegraId: invoiceId,
        metadata: invoiceNumber ? { invoiceNumber } : undefined,
      });
      if (orderGid) {
        await saveMapping({
          entity: "order",
          shopifyId: orderGid,
          alegraId: invoiceId,
          metadata: invoiceNumber ? { invoiceNumber } : undefined,
        });
      }
      if (invoiceNumber) {
        await updateMappingMetadata("order", invoiceId, { invoiceNumber });
      }
      const orderMeta = buildOrderMetaFromPayload(payload);
      await upsertOrder({
        shopDomain,
        shopifyId: orderId,
        alegraId: invoiceId,
        orderNumber: orderMeta.orderNumber,
        customerName: orderMeta.customerName,
        customerEmail: orderMeta.customerEmail,
        productsSummary: orderMeta.productsSummary,
        processedAt: orderMeta.processedAt,
        status: payload.financial_status || undefined,
        total: payload.total_price ? Number(payload.total_price) : null,
        currency: payload.currency || undefined,
        alegraStatus: "facturado",
        invoiceNumber,
        sourceUpdatedAt: orderMeta.processedAt,
        source: "shopify",
      });
    }
    if (idempotencyKey) {
      await markIdempotencyKey(idempotencyKey, "completed");
    }
  }

  let payment = null;
  if (payload.financial_status === "paid" && invoiceSettings.applyPayment && invoiceId) {
    if (!bankAccountId) {
      await createSyncLog({
        entity: "order",
        direction: "shopify->alegra",
        status: "warn",
        message: "Payment skipped: missing bank account",
        request: { orderId: orderId || null },
      });
    } else {
      const paymentKey = orderId ? `payment:${orderId}` : undefined;
      if (paymentKey) {
        const idempotency = await acquireIdempotencyKey(paymentKey);
        if (!idempotency.acquired) {
          await createSyncLog({
            entity: "order",
            direction: "shopify->alegra",
            status: "warn",
            message: "Payment skipped: already processed",
            request: { orderId: orderId || null },
          });
        } else {
          try {
            payment = await createPaymentForInvoice({
              ctx,
              invoiceId,
              clientId: contactId,
              amount: payload.total_price ? Number(payload.total_price) : 0,
              paymentMethod,
              bankAccountId,
              observations: interpolateObservations(invoiceSettings.observationsTemplate, payload),
            });
            await markIdempotencyKey(paymentKey, "completed");
          } catch (error) {
            await markIdempotencyKey(
              paymentKey,
              "failed",
              (error as { message?: string })?.message || "Payment failed"
            );
            throw error;
          }
        }
      } else {
        payment = await createPaymentForInvoice({
          ctx,
          invoiceId,
          clientId: contactId,
          amount: payload.total_price ? Number(payload.total_price) : 0,
          paymentMethod,
          bankAccountId,
          observations: interpolateObservations(invoiceSettings.observationsTemplate, payload),
        });
      }
    }
  }

  const adjustmentWarehouseId = resolvedWarehouseId
    ? String(resolvedWarehouseId)
    : ctx.alegraWarehouseId;
  const adjustmentKey = orderId ? `inventory-adjust:${orderId}` : undefined;
  let adjustment = null;
  if (adjustmentKey) {
    const idempotency = await acquireIdempotencyKey(adjustmentKey);
    if (!idempotency.acquired) {
      await createSyncLog({
        entity: "inventory",
        direction: "shopify->alegra",
        status: "warn",
        message: "Inventory adjustment skipped: already processed",
        request: { orderId: orderId || null },
      });
    } else {
      try {
        adjustment = await createInventoryAdjustmentFromOrder(
          payload,
          adjustmentWarehouseId,
          ctx
        );
        await markIdempotencyKey(adjustmentKey, "completed");
      } catch (error) {
        await markIdempotencyKey(
          adjustmentKey,
          "failed",
          (error as { message?: string })?.message || "Inventory adjustment failed"
        );
        throw error;
      }
    }
  } else {
    adjustment = await createInventoryAdjustmentFromOrder(
      payload,
      adjustmentWarehouseId,
      ctx
    );
  }

  return { handled: true, contactId, invoice, payment, adjustment };
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

async function safeCreateInvoiceLog(
  orderId: string | undefined,
  invoicePayload: Record<string, unknown>,
  status: "success" | "fail",
  error?: unknown,
  invoice?: Record<string, unknown> | null
) {
  try {
    const message =
      status === "success"
        ? "Invoice created"
        : (error as { message?: string })?.message || "Invoice creation failed";
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status,
      message,
      request: {
        orderId: orderId || null,
        invoicePayload,
      },
      response: invoice ? { invoiceId: invoice.id || null, invoice } : undefined,
    });
  } catch {
    // ignore log failures
  }
}

function buildContactName(payload: ShopifyOrderPayload) {
  const first = payload.customer?.first_name || "";
  const last = payload.customer?.last_name || "";
  const name = `${first} ${last}`.trim();
  return name || payload.email || "Cliente Shopify";
}

function buildProductsSummaryFromPayload(payload: ShopifyOrderPayload) {
  const items = Array.isArray(payload.line_items) ? payload.line_items : [];
  if (!items.length) return "-";
  return items
    .map((item) => {
      const qty = item.quantity || 0;
      const title = item.title || "Item";
      return `${qty}x ${title}`;
    })
    .join(", ");
}

function resolvePayloadTimestamp(payload: ShopifyOrderPayload) {
  const raw =
    payload.processed_at ||
    payload.processedAt ||
    payload.created_at ||
    payload.createdAt ||
    "";
  if (!raw) return null;
  const parsed = Date.parse(String(raw));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function buildOrderChecklist(
  payload: ShopifyOrderPayload,
  options: { requireInvoice: boolean }
) {
  const missing: string[] = [];
  if (!payload.id) {
    missing.push("order_id");
  }
  if (options.requireInvoice) {
    const items = Array.isArray(payload.line_items) ? payload.line_items : [];
    if (!items.length) {
      missing.push("line_items");
    }
    if (!payload.currency) {
      missing.push("currency");
    }
    if (!payload.total_price) {
      missing.push("total_price");
    }
  }
  return missing;
}

function buildInvoiceSettingsChecklist(settings: InvoiceSettings) {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (settings.generateInvoice && !settings.resolutionId) {
    warnings.push("resolution_id");
  }
  if (settings.generateInvoice && settings.applyPayment && !settings.bankAccountId) {
    warnings.push("bank_account_id");
  }
  if (settings.generateInvoice && settings.applyPayment && !settings.paymentMethod) {
    warnings.push("payment_method");
  }
  return { blocking, warnings };
}

function buildInvoiceSettingsWarnings(settings: InvoiceSettings) {
  const warnings: string[] = [];
  if (settings.generateInvoice && !settings.warehouseId) {
    warnings.push("warehouse_id");
  }
  return warnings;
}

function buildOrderMetaFromPayload(payload: ShopifyOrderPayload) {
  const customerName = buildContactName(payload);
  const customerEmail = payload.customer?.email || payload.email || null;
  const orderNumber = payload.name
    ? String(payload.name)
    : payload.id
      ? String(payload.id)
      : null;
  return {
    orderNumber,
    customerName,
    customerEmail,
    productsSummary: buildProductsSummaryFromPayload(payload),
    processedAt: resolvePayloadTimestamp(payload),
  };
}

function buildInvoicePayload(
  payload: ShopifyOrderPayload,
  contactId: string,
  settings: InvoiceSettings,
  paymentMethodOverride?: string
) {
  const today = new Date().toISOString().slice(0, 10);
  const resolvedPaymentMethod = paymentMethodOverride || settings.paymentMethod;
  return {
    client: contactId,
    date: today,
    dueDate: today,
    resolution: settings.resolutionId ? { id: settings.resolutionId } : undefined,
    costCenter: settings.costCenterId ? { id: settings.costCenterId } : undefined,
    warehouse: settings.warehouseId ? { id: settings.warehouseId } : undefined,
    seller: settings.sellerId ? { id: settings.sellerId } : undefined,
    paymentMethod: resolvedPaymentMethod || undefined,
    observations: interpolateObservations(settings.observationsTemplate, payload),
    items: (payload.line_items || []).map((item) => ({
      name: item.title || item.sku || "Item",
      price: item.discounted_price
        ? Number(item.discounted_price)
        : item.price
        ? Number(item.price)
        : 0,
      quantity: item.quantity || 1,
    })),
  };
}

function resolveInvoiceWarehouseId(
  storeConfig: Awaited<ReturnType<typeof resolveStoreConfig>>,
  transferResult: TransferDecision | null,
  invoiceSettings: InvoiceSettings
) {
  const destinationId = storeConfig.transferDestinationWarehouseId;
  if (storeConfig.transferEnabled !== false && destinationId) {
    return destinationId;
  }
  if (transferResult?.chosenWarehouseId) {
    return transferResult.chosenWarehouseId;
  }
  return invoiceSettings.warehouseId || "";
}

type InvoiceSettings = {
  generateInvoice: boolean;
  resolutionId: string;
  costCenterId: string;
  warehouseId: string;
  sellerId: string;
  paymentMethod: string;
  bankAccountId: string;
  applyPayment: boolean;
  observationsTemplate: string;
  einvoiceEnabled: boolean;
};

type TransferDecision = {
  blocked: boolean;
  reason: string;
  chosenWarehouseId?: string;
  rule?: string;
  details?: Record<string, unknown>;
};

async function loadInvoiceSettings(pool: Pool, orgId: number): Promise<InvoiceSettings> {
  const { ensureInvoiceSettingsColumns } = await import("../db");
  await ensureInvoiceSettingsColumns(pool);
  const result = await pool.query<{
    generate_invoice: boolean;
    resolution_id: string | null;
    cost_center_id: string | null;
    warehouse_id: string | null;
    seller_id: string | null;
    payment_method: string | null;
    bank_account_id: string | null;
    apply_payment: boolean | null;
    observations_template: string | null;
    einvoice_enabled: boolean | null;
  }>(
    `
    SELECT generate_invoice, resolution_id, cost_center_id, warehouse_id, seller_id, payment_method, bank_account_id, apply_payment, observations_template, einvoice_enabled
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );

  if (!result.rows.length) {
    return {
      generateInvoice: false,
      resolutionId: "",
      costCenterId: "",
      warehouseId: "",
      sellerId: "",
      paymentMethod: "",
      bankAccountId: "",
      applyPayment: false,
      observationsTemplate: "",
      einvoiceEnabled: false,
    };
  }

  const row = result.rows[0];
  return {
    generateInvoice: row.generate_invoice,
    resolutionId: row.resolution_id || "",
    costCenterId: row.cost_center_id || "",
    warehouseId: row.warehouse_id || "",
    sellerId: row.seller_id || "",
    paymentMethod: row.payment_method || "",
    bankAccountId: row.bank_account_id || "",
    applyPayment: Boolean(row.apply_payment),
    observationsTemplate: row.observations_template || "",
    einvoiceEnabled: Boolean(row.einvoice_enabled),
  };
}

async function resolveBankAccountId(
  pool: Pool,
  orgId: number,
  paymentMethod: string,
  defaultBankAccountId: string
) {
  if (!paymentMethod) {
    return defaultBankAccountId;
  }
  const result = await pool.query<{ account_id: string }>(
    `
    SELECT account_id
    FROM payment_mappings
    WHERE organization_id = $1 AND (payment_method = $2 OR method_id = $2)
    LIMIT 1
    `,
    [orgId, paymentMethod]
  );
  if (result.rows.length) {
    return result.rows[0].account_id;
  }
  return defaultBankAccountId;
}

async function resolvePaymentMappingBySource(
  pool: Pool,
  orgId: number,
  sources: string[]
) {
  if (!sources.length) return null;
  const normalized = sources.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!normalized.length) return null;
  const result = await pool.query<{
    method_id: string;
    method_label: string | null;
    account_id: string;
    payment_method: string | null;
    payment_method_label: string | null;
  }>(
    `
    SELECT method_id, method_label, account_id, payment_method, payment_method_label
    FROM payment_mappings
    WHERE organization_id = $1 AND lower(method_id) = ANY($2)
    LIMIT 1
    `,
    [orgId, normalized]
  );
  if (!result.rows.length) {
    return null;
  }
  const row = result.rows[0];
  return {
    sourceMethod: row.method_id,
    sourceLabel: row.method_label || "",
    accountId: row.account_id,
    paymentMethod: row.payment_method || "",
    paymentMethodLabel: row.payment_method_label || "",
  };
}

function extractPaymentGateways(payload: ShopifyOrderPayload) {
  const names: string[] = [];
  if (Array.isArray(payload.payment_gateway_names)) {
    names.push(...payload.payment_gateway_names);
  }
  if (payload.gateway) {
    names.push(payload.gateway);
  }
  return names;
}

function interpolateObservations(
  template: string,
  payload: ShopifyOrderPayload
) {
  if (!template) {
    return undefined;
  }
  return template
    .replace("{{order.name}}", payload.name || "")
    .replace("{{order.id}}", payload.id ? String(payload.id) : "")
    .replace("{{customer.email}}", payload.email || payload.customer?.email || "");
}

function extractOrderId(payload: ShopifyOrderPayload) {
  if (payload.id) {
    return String(payload.id);
  }
  return undefined;
}

function toOrderGid(orderId: string) {
  if (orderId.startsWith("gid://")) {
    return orderId;
  }
  return `gid://shopify/Order/${orderId}`;
}

async function createPaymentForInvoice(input: {
  ctx: Awaited<ReturnType<typeof buildSyncContext>>;
  invoiceId?: number | string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  bankAccountId: string;
  observations?: string;
}) {
  if (!input.invoiceId || !input.amount) {
    return { handled: false, reason: "missing_invoice_or_amount" };
  }
  const date = new Date().toISOString().slice(0, 10);
  const payload = {
    date,
    bankAccount: Number(input.bankAccountId),
    client: Number(input.clientId),
    amount: input.amount,
    paymentMethod: input.paymentMethod || "transfer",
    invoices: [
      {
        id: Number(input.invoiceId),
        amount: input.amount,
      },
    ],
    observations: input.observations || undefined,
    type: "received",
  };
  return input.ctx.alegra.createPayment(payload);
}

async function createInventoryAdjustmentFromOrder(
  payload: ShopifyOrderPayload,
  warehouseId: string | undefined,
  ctx: Awaited<ReturnType<typeof buildSyncContext>>
) {
  if (!warehouseId) {
    await createSyncLog({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "warn",
      message: "Missing warehouse for inventory adjustment",
      request: { orderId: payload.id || null },
    });
    return { handled: false, reason: "missing_warehouse_id" };
  }

  const items: Array<Record<string, unknown>> = [];
  const missingVariants: string[] = [];
  for (const item of payload.line_items || []) {
    const variantId = item.variant_id ? String(item.variant_id) : undefined;
    if (!variantId) {
      continue;
    }
    const mapping = await getMappingByShopifyId("item", variantId);
    if (!mapping?.alegraId) {
      missingVariants.push(variantId);
      continue;
    }
    items.push({
      id: Number(mapping.alegraId),
      quantity: -(item.quantity || 1),
      observations: payload.name ? `Venta Shopify ${payload.name}` : "Venta Shopify",
      warehouse: { id: Number(warehouseId) },
    });
  }

  if (missingVariants.length) {
    await createSyncLog({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing Alegra mapping for variants",
      request: { orderId: payload.id || null, missingVariants },
    });
  }

  if (!items.length) {
    await createSyncLog({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "warn",
      message: "No items to adjust",
      request: { orderId: payload.id || null },
    });
    return { handled: false, reason: "missing_mapped_items" };
  }

  const adjustmentPayload = {
    date: new Date().toISOString().slice(0, 10),
    observations: payload.name ? `Sync Shopify ${payload.name}` : "Sync Shopify",
    items,
  };

  return ctx.alegra.createInventoryAdjustment(adjustmentPayload);
}

export async function createInventoryAdjustmentFromRefund(
  payload: Record<string, unknown>,
  warehouseId: string | undefined,
  ctx: Awaited<ReturnType<typeof buildSyncContext>>
) {
  if (!warehouseId) {
    return { handled: false, reason: "missing_warehouse_id" };
  }

  const refundItems =
    (payload.refund_line_items as Array<Record<string, unknown>> | undefined) ||
    (payload.refundLineItems as Array<Record<string, unknown>> | undefined) ||
    [];

  const items: Array<Record<string, unknown>> = [];
  const missingVariants: string[] = [];
  for (const refundItem of refundItems) {
    const lineItem = refundItem.line_item as Record<string, unknown> | undefined;
    const variantId =
      (lineItem?.variant_id as string | number | undefined) ||
      (refundItem.variant_id as string | number | undefined);
    if (!variantId) {
      continue;
    }
    const mapping = await getMappingByShopifyId("item", String(variantId));
    if (!mapping?.alegraId) {
      missingVariants.push(String(variantId));
      continue;
    }
    const quantity = Number(refundItem.quantity || lineItem?.quantity || 1);
    items.push({
      id: Number(mapping.alegraId),
      quantity: Math.abs(quantity),
      observations: payload.order_id
        ? `Devolucion Shopify ${payload.order_id}`
        : "Devolucion Shopify",
      warehouse: { id: Number(warehouseId) },
    });
  }

  if (missingVariants.length) {
    await createSyncLog({
      entity: "refund",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing Alegra mapping for refund variants",
      request: { orderId: payload.order_id || null, missingVariants },
    });
  }

  if (!items.length) {
    return { handled: false, reason: "missing_mapped_items" };
  }

  const adjustmentPayload = {
    date: new Date().toISOString().slice(0, 10),
    observations: payload.order_id
      ? `Devolucion Shopify ${payload.order_id}`
      : "Devolucion Shopify",
    items,
  };

  return ctx.alegra.createInventoryAdjustment(adjustmentPayload);
}

async function createInventoryTransferFromOrder(
  payload: ShopifyOrderPayload,
  storeConfig: Awaited<ReturnType<typeof resolveStoreConfig>>,
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  pool: Pool,
  orgId: number,
  orderId?: string,
  shopDomain?: string
): Promise<TransferDecision | null> {
  const transferKey = orderId ? `transfer:${orderId}` : undefined;
  if (transferKey) {
    const idempotency = await acquireIdempotencyKey(transferKey);
    if (!idempotency.acquired) {
      await createSyncLog({
        entity: "transfer",
        direction: "shopify->alegra",
        status: "warn",
        message: "Transfer skipped: already processed",
        request: { orderId: orderId || null },
      });
      return null;
    }
  }
  const transferEnabled = storeConfig.transferEnabled !== false;
  const destinationId = storeConfig.transferDestinationWarehouseId;
  const strategy = storeConfig.transferStrategy || "manual";
  let originIds = storeConfig.transferOriginWarehouseIds || [];
  if (strategy !== "manual") {
    try {
      const warehouses = (await ctx.alegra.listWarehouses()) as Array<{ id?: string | number }>;
      originIds = warehouses
        .map((warehouse) => String(warehouse?.id || ""))
        .filter(Boolean);
    } catch {
      originIds = [];
    }
  }
  const shouldBlock = (reason: string, details?: Record<string, unknown>) => {
    const decision = transferEnabled
      ? { blocked: true, reason, details }
      : {
          blocked: false,
          reason: "transfer_disabled",
          details: { ...details, originalReason: reason },
        };
    return decision;
  };

  if ((!destinationId && transferEnabled) || !originIds.length) {
    const decision = {
      ...shouldBlock("missing_transfer_config", { destinationId, originIds, strategy }),
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "failed", decision.reason);
    }
    return decision;
  }

  const items: Array<{ alegraId: string; quantity: number; sku?: string }> = [];
  const missing: string[] = [];
  for (const item of payload.line_items || []) {
    const variantId = item.variant_id ? String(item.variant_id) : "";
    if (!variantId) continue;
    const mapping = await getMappingByShopifyId("item", variantId);
    if (!mapping?.alegraId) {
      missing.push(variantId);
      continue;
    }
    items.push({
      alegraId: String(mapping.alegraId),
      quantity: item.quantity || 1,
      sku: item.sku || undefined,
    });
  }

  if (missing.length || !items.length) {
    const decision = {
      ...shouldBlock("missing_item_mapping", { missing, items: items.length }),
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "failed", decision.reason);
    }
    return decision;
  }

  const inventoryByItem = await Promise.all(
    items.map(async (item) => {
      const detail = (await ctx.alegra.getItem(item.alegraId)) as {
        inventory?: { warehouses?: Array<{ id?: string | number; availableQuantity?: number }> };
      };
      return {
        ...item,
        warehouses: Array.isArray(detail?.inventory?.warehouses)
          ? detail.inventory.warehouses
          : [],
      };
    })
  );

  const warehouseStats = originIds.map((warehouseId) => {
    let itemsWithStock = 0;
    let totalAvailable = 0;
    const missingItems: Array<{ alegraId: string; needed: number; available: number }> = [];
    inventoryByItem.forEach((item) => {
      const warehouse = item.warehouses.find(
        (entry) => String(entry?.id) === String(warehouseId)
      );
      const available = Number(warehouse?.availableQuantity || 0);
      totalAvailable += available;
      if (available >= item.quantity) {
        itemsWithStock += 1;
      } else {
        missingItems.push({
          alegraId: item.alegraId,
          needed: item.quantity,
          available,
        });
      }
    });
    return {
      warehouseId,
      itemsWithStock,
      totalAvailable,
      canFulfillAll: itemsWithStock === items.length,
      missingItems,
    };
  });

  const eligible = warehouseStats.filter((stat) => stat.canFulfillAll);
  if (!eligible.length) {
    const decision = {
      ...shouldBlock("insufficient_stock", {
        items: inventoryByItem,
        warehouses: warehouseStats,
        strategy,
      }),
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "failed", decision.reason);
    }
    return decision;
  }

  const pickByItems = (list: typeof eligible) =>
    list.sort((a, b) => b.itemsWithStock - a.itemsWithStock || b.totalAvailable - a.totalAvailable)[0];
  const pickByMax = (list: typeof eligible) =>
    list.sort((a, b) => b.totalAvailable - a.totalAvailable)[0];
  const priorityId = await resolvePriorityWarehouseId(ctx, storeConfig);
  let chosen = eligible[0];
  let rule = "consolidation";

  if (strategy === "priority") {
    const priority = priorityId
      ? eligible.find((stat) => String(stat.warehouseId) === String(priorityId))
      : null;
    if (priority) {
      chosen = priority;
      rule = "priority";
    } else {
      const best = pickByMax(eligible);
      if (best) chosen = best;
      rule = "max_stock";
    }
  } else if (strategy === "max_stock") {
    const best = pickByMax(eligible);
    if (best) chosen = best;
    rule = "max_stock";
  } else if (strategy === "manual") {
    const best = pickByItems(eligible);
    if (best) chosen = best;
    rule = "manual";
  } else {
    const best = pickByItems(eligible);
    if (best) chosen = best;
    rule = "consolidation";
  }

  await recordTransferDecision(pool, orgId, shopDomain, orderId, {
    blocked: false,
    reason: rule,
    chosenWarehouseId: chosen.warehouseId,
    rule,
    details: { priorityId, warehouses: warehouseStats, strategy },
  });

  if (!transferEnabled) {
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_disabled",
      chosenWarehouseId: chosen.warehouseId,
      rule: "transfer_disabled",
    };
  }

  const transferPayload = {
    date: new Date().toISOString().slice(0, 10),
    observations: payload.name ? `Traslado Shopify ${payload.name}` : "Traslado Shopify",
    warehouseFrom: { id: Number(chosen.warehouseId) },
    warehouseTo: { id: Number(destinationId) },
    items: items.map((item) => ({
      id: Number(item.alegraId),
      quantity: item.quantity,
    })),
  };

  try {
    await ctx.alegra.createInventoryTransfer(transferPayload);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_ok",
      chosenWarehouseId: chosen.warehouseId,
      rule: "transfer_ok",
    };
  } catch (error) {
    const decision = {
      blocked: true,
      reason: "transfer_failed",
      details: { message: (error as { message?: string })?.message || "transfer_failed" },
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(
        transferKey,
        "failed",
        (error as { message?: string })?.message || "transfer_failed"
      );
    }
    return decision;
  }
}

async function resolvePriorityWarehouseId(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  storeConfig: Awaited<ReturnType<typeof resolveStoreConfig>>
) {
  if (storeConfig.transferPriorityWarehouseId) {
    return storeConfig.transferPriorityWarehouseId;
  }
  return undefined;
}

async function recordTransferDecision(
  pool: Pool,
  orgId: number,
  shopDomain: string | undefined,
  orderId: string | undefined,
  decision: TransferDecision
) {
  try {
    await pool.query(
      `
      INSERT INTO inventory_transfer_decisions
        (organization_id, shop_domain, order_id, chosen_warehouse_id, rule, details_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        orgId,
        shopDomain || null,
        orderId || null,
        decision.chosenWarehouseId || null,
        decision.rule || decision.reason || null,
        decision.details || {},
      ]
    );
  } catch {
    // ignore decision log failures
  }
}
