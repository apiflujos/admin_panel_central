import { buildSyncContext } from "./sync-context";
import { getMappingByShopifyId, saveMapping, updateMappingMetadata } from "./mapping.service";
import { upsertContact } from "./contacts.service";
import { upsertOrder } from "./orders.service";
import { createSyncLog } from "./logs.service";
import { acquireIdempotencyKey, markIdempotencyKey } from "./idempotency.service";
import { getOrderInvoiceOverride, validateEinvoiceData } from "./order-invoice-overrides.service";
import { resolveStoreConfig } from "./store-config.service";
import type { ShopifyOrderMode } from "./store-config.service";
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
  // Etiquetas del pedido (Shopify: string separado por comas). Puede traer el
  // medio de pago (crediplatam, crédito directo, etc.).
  tags?: string;
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
      company?: string;
    };
  };
  // Becam recoge la cédula del cliente en el campo `company` de la dirección del
  // checkout (no en el teléfono). Se usa como fuente de identificación.
  shipping_address?: { company?: string; phone?: string };
  billing_address?: { company?: string; phone?: string };
  line_items?: Array<{
    sku?: string;
    quantity?: number;
    price?: string;
    discounted_price?: string;
    title?: string;
    variant_id?: number | string;
    // Descuentos por línea (apps de descuento por cantidad los ponen aquí, no en
    // `discounted_price`). `total_discount` es el total del descuento de la línea.
    total_discount?: string;
    discount_allocations?: Array<{ amount?: string }>;
  }>;
  shipping_lines?: Array<{ title?: string; price?: string }>;
  financial_status?: string;
  fulfillment_status?: string | null;
};

type ForceSyncOptions = {
  generateInvoice?: boolean;
  skipRules?: boolean;
  orderModeOverride?: ShopifyOrderMode;
  // Fuerza factura electrónica para esta llamada (facturación manual por pedido
  // "a discreción"), independiente del toggle global. Requiere que el pedido
  // tenga su override fiscal (einvoiceRequested + datos DIAN).
  forceEinvoice?: boolean;
};

export async function syncShopifyOrderToAlegra(payload: ShopifyOrderPayload, options?: ForceSyncOptions) {
  const orderId = extractOrderId(payload);
  const shopDomain = payload.__shopDomain || "";
  if (!orderId) {
    return syncShopifyOrderToAlegraInner(payload, options);
  }
  const { getPool } = await import("../db");
  const pool = getPool();
  const lockKey = `shopify-order:${shopDomain}:${orderId}`;
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    return await syncShopifyOrderToAlegraInner(payload, options);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
    } catch {
      // ignore unlock failures
    }
    client.release();
  }
}

async function syncShopifyOrderToAlegraInner(payload: ShopifyOrderPayload, options?: ForceSyncOptions) {
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
  const orderMode = options?.orderModeOverride || storeConfig.syncOrdersShopifyToAlegra || "invoice";
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
  if (options?.forceEinvoice) {
    invoiceSettings.einvoiceEnabled = true;
  }
  // Trigger "cuando esté preparado": en el flujo automático (webhook/poller), si
  // está configurado on_fulfilled y el pedido aún NO está fulfilled en Shopify,
  // NO factura todavía (se guarda como pendiente). La facturación manual por
  // pedido (options.generateInvoice === true) lo salta a propósito.
  if (invoiceSettings.invoiceTrigger === "on_fulfilled" && options?.generateInvoice !== true) {
    const fulfilled = String(payload.fulfillment_status || "").toLowerCase() === "fulfilled";
    if (!fulfilled) {
      invoiceSettings.generateInvoice = false;
    }
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
  const taxRules = await loadTaxRules(pool, orgId);
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
  // Contact matching: primero por mapping (customerId → alegraContactId), luego email como fallback.
  // Evita colapsar clientes distintos que comparten email (ej: guest checkouts con mismo correo).
  const customerId = payload.customer?.id ? String(payload.customer.id) : "";
  const contactMappingRow = customerId
    ? await getMappingByShopifyId("contact", customerId)
    : undefined;
  let existing: Array<{ id: string | number }> = [];
  if (contactMappingRow?.alegraId) {
    existing = [{ id: contactMappingRow.alegraId }];
  } else {
    existing = (await ctx.alegra.findContactByEmail(effectiveEmail)) as Array<{
      id: string | number;
    }>;
  }

  const contactMapping = mapShopifyToAlegraContact(payload, effectiveEmail, {
    einvoiceActive,
    override: override || undefined,
  });
  // Fail-closed SOLO si además el cliente NO existe ya en Alegra. Muchos pedidos
  // no traen la cédula en el payload (el cliente pone un nombre en `company`),
  // pero el cliente YA existe en Alegra —por email o por mapping— con su cédula
  // guardada. En ese caso se usa ese contacto existente (el update no manda
  // identificación, así que no le borra la cédula). Solo se falla cuando no hay
  // cédula en el pedido Y tampoco existe el contacto. (Antes fallaba aunque el
  // cliente existiera con cédula válida en Alegra.)
  const hasExistingContact = Boolean(existing && existing.length > 0);
  if (!contactMapping.hasRealIdentification && !hasExistingContact) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: "Falta identificación real del cliente. Carga override e-invoice antes de emitir la factura.",
      request: { orderId, customerEmail: effectiveEmail },
    });
    return { handled: false, reason: "missing_customer_identification" };
  }
  const { hasRealIdentification: _hasReal, ...rawContact } = contactMapping;
  const identification = contactMapping.identification;
  const contactName = contactMapping.name;
  const contactPayload = rawContact;
  // Alegra /contacts espera la dirección como OBJETO y rechaza (400) campos
  // sueltos como city/department/country/postalCode/identificationType a nivel
  // raíz. Se arma un payload limpio con la estructura que Alegra acepta.
  // La identificación DEBE viajar con su tipo: Alegra Colombia exige
  // `identificationObject: { type, number }` y responde 2035 ("Missing
  // identification type") si solo se manda el número suelto. (Bug anterior:
  // el tipo `CC` se calculaba pero se botaba al armar este payload.)
  const identificationType = String((rawContact as { identificationType?: unknown }).identificationType || "CC");
  const alegraContactPayload: Record<string, unknown> = {
    name: contactName,
    ...(identification
      ? {
          identificationObject: { type: identificationType, number: identification },
        }
      : {}),
    ...(rawContact.email ? { email: rawContact.email } : {}),
    ...(rawContact.phonePrimary ? { phonePrimary: rawContact.phonePrimary } : {}),
    ...(rawContact.address
      ? {
          address: {
            address: rawContact.address,
            ...(rawContact.city ? { city: rawContact.city } : {}),
            ...(rawContact.department ? { department: rawContact.department } : {}),
          },
        }
      : {}),
  };

  let contactId: string;
  if (existing && existing.length > 0) {
    contactId = String(existing[0].id);
    try {
      await ctx.alegra.updateContact(contactId, alegraContactPayload);
    } catch (error) {
      const message = (error as { message?: string })?.message || "Contact update failed";
      // Solo 2035 = falta el TIPO de identificación (fail-closed legítimo).
      if (message.includes("2035")) {
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
      const created = (await ctx.alegra.createContact(alegraContactPayload)) as { id: string };
      contactId = String(created.id);
    } catch (error) {
      const message = (error as { message?: string })?.message || "Contact creation failed";
      // 2006 = ya existe un contacto con esa identificación (el cliente estaba en
      // Alegra pero con otro email, así que el match por email falló). Se REUTILIZA
      // ese contacto en vez de duplicar; Alegra devuelve su contactId en el error.
      const duplicateContactId = extractDuplicateContactId(error);
      if (duplicateContactId) {
        contactId = duplicateContactId;
      } else if (message.includes("2035")) {
        // Solo 2035 = falta el TIPO de identificación (fail-closed legítimo).
        await createSyncLog({
          entity: "order",
          direction: "shopify->alegra",
          status: "fail",
          message: "Missing identification type",
          request: { orderId },
        });
        return { handled: false, reason: "missing_identification_type" };
      } else {
        throw error;
      }
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
  // Alegra exige el id del ítem en cada línea de la factura (code 3065). Se
  // resuelve por línea: id de Alegra (mapping de la variante → SKU en products)
  // y el impuesto del ítem (para descontar el IVA del precio con-IVA de Shopify
  // y aplicarlo como corresponde).
  const resolvedLines = await Promise.all(
    (payload.line_items || []).map(async (li) => {
      const variantId = li.variant_id ? String(li.variant_id) : "";
      let alegraItemId: string | null = null;
      if (variantId) {
        const mapping = await getMappingByShopifyId("item", variantId);
        if (mapping?.alegraId) alegraItemId = String(mapping.alegraId);
      }
      if (!alegraItemId && li.sku) {
        const bySku = await pool.query<{ alegra_item_id: string | null }>(
          `SELECT alegra_item_id FROM products
           WHERE organization_id = $1 AND sku = $2 AND alegra_item_id IS NOT NULL
           LIMIT 1`,
          [orgId, String(li.sku)]
        );
        if (bySku.rows[0]?.alegra_item_id) alegraItemId = String(bySku.rows[0].alegra_item_id);
      }
      let taxId: string | null = null;
      let taxRate = 0;
      if (alegraItemId) {
        const taxRow = await pool.query<{ tax_id: string | null; pct: string | null }>(
          `SELECT payload_json->'tax'->0->>'id' AS tax_id,
                  payload_json->'tax'->0->>'percentage' AS pct
           FROM products
           WHERE organization_id = $1 AND alegra_item_id = $2
           LIMIT 1`,
          [orgId, alegraItemId]
        );
        if (taxRow.rows[0]?.tax_id) {
          taxId = String(taxRow.rows[0].tax_id);
          taxRate = Number(taxRow.rows[0].pct || 0) / 100;
        }
      }
      return { alegraItemId, taxId, taxRate, sku: li.sku, variantId };
    })
  );
  const unmappedLines = resolvedLines.filter((l) => !l.alegraItemId).map((l) => l.sku || l.variantId || "?");
  if (invoiceSettings.generateInvoice && unmappedLines.length) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "fail",
      message: "Missing Alegra item id for invoice lines",
      request: { orderId, unmappedLines },
    });
    return { handled: false, reason: "missing_item_mapping" };
  }
  const invoicePayload = buildInvoicePayload(
    payload,
    contactId,
    effectiveInvoiceSettings,
    paymentMethod,
    taxRules,
    resolvedLines
  );
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
      let payloadToSend: Record<string, unknown> = invoicePayload;
      try {
        invoice = await ctx.alegra.createInvoice(payloadToSend);
      } catch (error) {
        const status = payloadToSend?.status;
        if (status === "draft") {
          const retryPayload = { ...payloadToSend };
          delete retryPayload.status;
          payloadToSend = retryPayload;
          invoice = await ctx.alegra.createInvoice(payloadToSend);
        } else {
          throw error;
        }
      }
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
  // Solo `paid` genera pago full. Estados intermedios se skip explícitamente para evitar
  // rerun-re-apply del total completo tras un refund parcial o cancelación.
  const financialStatus = String(payload.financial_status || "").toLowerCase();
  const paymentAllowedStatuses = new Set(["paid"]);
  const paymentSkipStatuses = new Set([
    "partially_paid",
    "partially_refunded",
    "refunded",
    "voided",
    "pending",
    "authorized",
  ]);
  if (
    invoiceId &&
    invoiceSettings.applyPayment &&
    paymentSkipStatuses.has(financialStatus)
  ) {
    await createSyncLog({
      entity: "order",
      direction: "shopify->alegra",
      status: "warn",
      message: `Payment skipped: financial_status=${financialStatus} (usa acción manual para pagos parciales/refunds)`,
      request: { orderId: orderId || null },
    });
  }
  // El pago solo se puede registrar sobre una factura EMITIDA (open). Con
  // "Factura electrónica" en OFF la factura queda en borrador y Alegra rechaza
  // el pago (4096). Por eso el pago solo se intenta cuando la emisión está ON.
  if (
    paymentAllowedStatuses.has(financialStatus) &&
    invoiceSettings.applyPayment &&
    invoiceSettings.einvoiceEnabled &&
    invoiceId
  ) {
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

  const adjustmentWarehouseId = resolvedWarehouseId ? String(resolvedWarehouseId) : ctx.alegraWarehouseId;
  const adjustmentKey = orderId ? `inventory-adjust:${orderId}` : undefined;
  let adjustment = null;
  // Ajuste de inventario DESACTIVADO a propósito: cuando Alegra EMITE la factura
  // ya descuenta el stock de los ítems (bodega Principal por defecto). Un ajuste
  // separado DUPLICARÍA el descuento. Se deja el toggle por si algún día se
  // factura sin descontar stock; en ese caso hay que actualizar el payload de
  // createInventoryAdjustmentFromOrder (Alegra exige id string + type + unitCost).
  const INVENTORY_ADJUSTMENT_ENABLED = false;
  if (INVENTORY_ADJUSTMENT_ENABLED && adjustmentKey && invoiceSettings.einvoiceEnabled) {
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
        adjustment = await createInventoryAdjustmentFromOrder(payload, adjustmentWarehouseId, ctx);
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
  } else if (INVENTORY_ADJUSTMENT_ENABLED && !adjustmentKey && invoiceSettings.einvoiceEnabled) {
    adjustment = await createInventoryAdjustmentFromOrder(payload, adjustmentWarehouseId, ctx);
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
      status === "success" ? "Invoice created" : (error as { message?: string })?.message || "Invoice creation failed";
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

export function buildContactName(payload: ShopifyOrderPayload) {
  const first = payload.customer?.first_name || "";
  const last = payload.customer?.last_name || "";
  const name = `${first} ${last}`.trim();
  return name || payload.email || "Cliente Shopify";
}

export function mapShopifyToAlegraContact(
  payload: ShopifyOrderPayload,
  effectiveEmail: string,
  options: {
    einvoiceActive?: boolean;
    override?: {
      fiscalName?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zip?: string | null;
      idNumber?: string | null;
      idType?: string | null;
    };
  }
) {
  const { einvoiceActive, override } = options;
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
  const normalizedPhoneId = phoneId.startsWith("57") && phoneId.length > 10 ? phoneId.slice(2) : phoneId;
  const phoneValid = normalizedPhoneId.length >= 6;
  // Becam recoge la CÉDULA en el campo `company` de la dirección del checkout.
  // Se usa como fuente de identificación cuando el teléfono no trae una cédula
  // válida (muchos clientes dejan el teléfono vacío).
  const companyRaw =
    payload.customer?.default_address?.company ||
    payload.shipping_address?.company ||
    payload.billing_address?.company ||
    "";
  const companyId = String(companyRaw).replace(/\D/g, "");
  // Nunca fabricamos NIT: si no hay ID real, dejamos vacío para que fail-closed downstream
  // (Alegra 2035) o el operador cargue un override e-invoice.
  // Prioridad de la cédula (antes usaba el teléfono primero, y a clientes con
  // celular les ponía el número de celular como "cédula"):
  //  1) override e-invoice (si aplica).
  //  2) `company` de la dirección: es el campo donde Becam recoge la CÉDULA
  //     (cuando trae dígitos). Va PRIMERO para no confundir teléfono con cédula.
  //  3) teléfono SOLO si no parece un celular colombiano (10 dígitos que
  //     empiezan por 3): un celular real no es una cédula.
  const phoneLooksLikeMobile = normalizedPhoneId.length === 10 && normalizedPhoneId.startsWith("3");
  const derivedIdentification =
    einvoiceActive && override?.idNumber
      ? override.idNumber
      : companyId.length >= 6
        ? companyId
        : phoneValid && !phoneLooksLikeMobile
          ? normalizedPhoneId
          : "";
  const hasRealIdentification = Boolean(derivedIdentification && derivedIdentification.length >= 6);

  return {
    ...contactPayload,
    identificationType: einvoiceActive && override?.idType ? override.idType : "CC",
    identification: hasRealIdentification ? derivedIdentification : "",
    hasRealIdentification,
  };
}

// Alegra responde 400 code 2006 ("Ya existe un contacto con la identificación ...")
// cuando se intenta crear un contacto cuyo documento ya existe. El detalle del
// error incluye el contactId existente; se extrae para reutilizarlo en vez de
// duplicar el contacto.
function extractDuplicateContactId(error: unknown): string | null {
  const raw =
    (error as { detail?: string })?.detail || (error as { message?: string })?.message || "";
  if (!raw.includes("2006")) return null;
  const start = raw.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(start)) as { code?: unknown; contactId?: unknown };
      if (String(parsed.code) === "2006" && parsed.contactId) return String(parsed.contactId);
    } catch {
      /* cae al regex de respaldo */
    }
  }
  const match = raw.match(/"contactId"\s*:\s*"?(\d+)"?/);
  return match ? match[1] : null;
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
  const raw = payload.processed_at || payload.processedAt || payload.created_at || payload.createdAt || "";
  if (!raw) return null;
  const parsed = Date.parse(String(raw));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function buildOrderChecklist(payload: ShopifyOrderPayload, options: { requireInvoice: boolean }) {
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
  if (settings.generateInvoice && settings.einvoiceEnabled && !settings.resolutionId) {
    blocking.push("resolution_id");
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
  const orderNumber = payload.name ? String(payload.name) : payload.id ? String(payload.id) : null;
  return {
    orderNumber,
    customerName,
    customerEmail,
    productsSummary: buildProductsSummaryFromPayload(payload),
    processedAt: resolvePayloadTimestamp(payload),
  };
}

export function buildInvoicePayload(
  payload: ShopifyOrderPayload,
  contactId: string,
  settings: InvoiceSettings,
  paymentMethodOverride?: string,
  taxRules?: Array<{ alegraTaxId: string }>,
  resolvedLines?: Array<{ alegraItemId: string | null; taxId: string | null; taxRate: number }>
) {
  const today = new Date().toISOString().slice(0, 10);
  const resolvedPaymentMethod = paymentMethodOverride || settings.paymentMethod;
  // Controlado por el toggle "Factura electrónica" (einvoiceEnabled):
  //  - OFF → "draft" (para pruebas desde Shopify, NO se emite a la DIAN).
  //  - ON  → "open" + objeto `stamp` (se emite electrónicamente a la DIAN).
  const status = settings.einvoiceEnabled ? "open" : "draft";

  // Fecha de la factura = fecha real del pedido (processed_at/created_at), no
  // "hoy". Alegra exige date y dueDate (yyyy-MM-dd).
  const orderDateRaw =
    (payload as { processed_at?: unknown }).processed_at ||
    (payload as { created_at?: unknown }).created_at ||
    null;
  const invoiceDate = orderDateRaw ? String(orderDateRaw).slice(0, 10) : today;

  // Forma de pago (Colombia, OBLIGATORIA en este Alegra):
  //  - Si la PASARELA de Shopify es de crédito (Sistecredito, Crédito Mayorista,
  //    financiación…) → CREDIT, aunque Shopify lo marque "paid".
  //  - Si no: pagado → contado (CASH); sin pagar → CREDIT.
  // paymentMethod es obligatorio cuando es CASH.
  const financialStatus = String((payload as { financial_status?: unknown }).financial_status || "").toLowerCase();
  const gateways = Array.isArray(payload.payment_gateway_names)
    ? payload.payment_gateway_names.map((g) => String(g))
    : [];
  const gatewayIsCredit = gateways.some((g) => /cr[eé]dito|credito|sistecredito|financ|cuota/i.test(g));
  const isPaid = financialStatus === "paid" || financialStatus === "partially_paid";
  const paymentForm = gatewayIsCredit ? "CREDIT" : isPaid ? "CASH" : "CREDIT";
  // Valor real que usa esta cuenta Alegra (visto en 500+ facturas): con CASH el
  // paymentMethod es "CASH" (mayúscula); con CREDIT se omite. El genérico "cash"
  // lo rechaza ("El método de pago no es válido").
  const paymentMethod = resolvedPaymentMethod || (paymentForm === "CASH" ? "CASH" : undefined);
  const orderName = (payload as { name?: unknown }).name ? String((payload as { name?: unknown }).name) : "";

  // Medio de pago que viaja a la factura (anotación visible). Sale de la
  // PASARELA (Sistecredito, Crédito Mayorista, Bank Deposit, Mercado Pago…) y,
  // si el pedido trae etiquetas que parezcan medio de pago (crediplatam, crédito
  // directo, sistecredito…), también se incluyen. Se deduplica.
  const orderTags = String((payload as { tags?: unknown }).tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const paymentTags = orderTags.filter((t) => /credi|cr[eé]dito|platam|sistecredito|directo|contado/i.test(t));
  const paymentMedium = Array.from(new Set([...gateways, ...paymentTags].filter(Boolean))).join(", ");

  // Impuesto global (tax_rules) como respaldo; el impuesto real de cada línea
  // sale del ítem de Alegra (resolvedLines[i].taxId). El campo en Alegra es
  // `tax` (no `taxes`), un array de { id }.
  const globalTaxes =
    taxRules && taxRules.length
      ? taxRules.map((r) => ({ id: Number(r.alegraTaxId) })).filter((t) => t.id > 0)
      : undefined;
  // Shopify (Becam) manda precios con IVA INCLUIDO (taxes_included). Alegra
  // espera el precio BASE (sin IVA) y aplica el impuesto encima. Se descuenta.
  const taxesIncluded =
    (payload as { taxes_included?: unknown }).taxes_included === true ||
    String((payload as { taxes_included?: unknown }).taxes_included ?? "") === "true";

  const lineItems = (payload.line_items || []).map((item, idx) => {
    const resolved = resolvedLines?.[idx];
    // Si Shopify ya trae `discounted_price` (neto), se usa tal cual. Si no (las
    // apps de descuento por cantidad NO lo llenan), se usa el precio full y el
    // descuento se manda aparte como porcentaje (ver `discount`).
    const usedGrossPrice = !item.discounted_price;
    const priceIncl = item.discounted_price
      ? Number(item.discounted_price)
      : item.price
        ? Number(item.price)
        : 0;
    const rate = resolved?.taxRate || 0;
    const basePrice = taxesIncluded && rate > 0 ? Number((priceIncl / (1 + rate)).toFixed(2)) : priceIncl;
    const lineTax = resolved?.taxId ? [{ id: Number(resolved.taxId) }] : globalTaxes;
    const quantity = item.quantity || 1;
    // Descuento de la línea (app de descuento por cantidad): `total_discount` o la
    // suma de `discount_allocations`. Se convierte a % sobre el bruto de la línea
    // (el % es igual con o sin IVA, así que aplica al precio base). Alegra aplica
    // el descuento y luego el impuesto.
    const lineDiscountAmount = usedGrossPrice
      ? Number(item.total_discount || 0) ||
        (Array.isArray(item.discount_allocations)
          ? item.discount_allocations.reduce((sum, a) => sum + Number(a?.amount || 0), 0)
          : 0)
      : 0;
    const lineGross = priceIncl * quantity;
    const discountPct =
      lineGross > 0 && lineDiscountAmount > 0
        ? Number(((lineDiscountAmount / lineGross) * 100).toFixed(4))
        : 0;
    return {
      ...(resolved?.alegraItemId ? { id: Number(resolved.alegraItemId) } : {}),
      name: item.title || item.sku || "Item",
      price: basePrice,
      quantity,
      ...(discountPct > 0 ? { discount: discountPct } : {}),
      ...(lineTax ? { tax: lineTax } : {}),
    };
  });

  const shippingItems = (payload.shipping_lines || [])
    .filter((s) => Number(s.price || 0) > 0)
    .map((s) => ({
      name: s.title || "Envío",
      price: Number(s.price),
      quantity: 1,
      ...(globalTaxes ? { tax: globalTaxes } : {}),
    }));

  return {
    client: Number(contactId),
    date: invoiceDate,
    dueDate: invoiceDate,
    status,
    resolution: settings.resolutionId ? { id: Number(settings.resolutionId) } : undefined,
    costCenter: settings.costCenterId ? { id: Number(settings.costCenterId) } : undefined,
    warehouse: settings.warehouseId ? { id: Number(settings.warehouseId) } : undefined,
    seller: settings.sellerId ? { id: Number(settings.sellerId) } : undefined,
    // Forma y método de pago (Colombia): obligatorios en este Alegra.
    paymentForm,
    ...(paymentMethod ? { paymentMethod } : {}),
    observations: interpolateObservations(settings.observationsTemplate, payload),
    // Anotación visible en la factura: referencia al pedido + medio de pago
    // (pasarela/etiquetas: Sistecredito, Crédito Mayorista, crediplatam, etc.).
    ...(orderName || paymentMedium
      ? {
          anotation: [orderName ? `Pedido Shopify ${orderName}` : "", paymentMedium ? `Medio de pago: ${paymentMedium}` : ""]
            .filter(Boolean)
            .join(" · "),
        }
      : {}),
    // Emisión electrónica a la DIAN: solo cuando el toggle "Factura electrónica"
    // está en Sí. En OFF NO se manda stamp → la factura queda como borrador.
    ...(settings.einvoiceEnabled ? { stamp: { generateStamp: true } } : {}),
    items: [...lineItems, ...shippingItems],
  };
}

function resolveInvoiceWarehouseId(
  storeConfig: Awaited<ReturnType<typeof resolveStoreConfig>>,
  transferResult: TransferDecision | null,
  invoiceSettings: InvoiceSettings
) {
  if (storeConfig.transferEnabled !== false && storeConfig.transferDestinationWarehouseId) {
    return storeConfig.transferDestinationWarehouseId;
  }
  if (transferResult?.chosenWarehouseId) {
    return transferResult.chosenWarehouseId;
  }
  return invoiceSettings.warehouseId || "";
}

type InvoiceSettings = {
  generateInvoice: boolean;
  invoiceStatus?: "draft" | "active";
  // Cuándo facturar: "on_create" (al entrar el pedido, default) u "on_fulfilled"
  // (solo cuando el pedido está preparado/fulfilled en Shopify).
  invoiceTrigger?: "on_create" | "on_fulfilled";
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
    invoice_trigger: string | null;
  }>(
    `
    SELECT generate_invoice, resolution_id, cost_center_id, warehouse_id, seller_id, payment_method, bank_account_id, apply_payment, observations_template, einvoice_enabled, invoice_trigger
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
      invoiceTrigger: "on_create",
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
    invoiceTrigger: row.invoice_trigger === "on_fulfilled" ? "on_fulfilled" : "on_create",
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

async function loadTaxRules(pool: Pool, orgId: number): Promise<Array<{ alegraTaxId: string }>> {
  const result = await pool.query<{ alegra_tax_id: string }>(
    `SELECT alegra_tax_id FROM tax_rules WHERE organization_id = $1`,
    [orgId]
  );
  return result.rows.map((row) => ({ alegraTaxId: row.alegra_tax_id }));
}

async function resolveBankAccountId(pool: Pool, orgId: number, paymentMethod: string, defaultBankAccountId: string) {
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

async function resolvePaymentMappingBySource(pool: Pool, orgId: number, sources: string[]) {
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

function interpolateObservations(template: string, payload: ShopifyOrderPayload) {
  if (!template) {
    return undefined;
  }
  const tokens: Record<string, string> = {
    "{{order.name}}": payload.name || "",
    "{{order.id}}": payload.id ? String(payload.id) : "",
    "{{order.total}}": payload.total_price ? String(payload.total_price) : "",
    "{{order.currency}}": payload.currency || "",
    "{{order.payment_gateways}}": Array.from(new Set(extractPaymentGateways(payload)))
      .filter(Boolean)
      .join(", "),
    "{{order.items_summary}}": buildProductsSummaryFromPayload(payload) || "",
    "{{customer.email}}": payload.email || payload.customer?.email || "",
    "{{customer.phone}}": payload.customer?.phone || "",
    "{{customer.name}}": buildContactName(payload) || "",
  };

  let result = template;
  Object.entries(tokens).forEach(([token, value]) => {
    result = result.split(token).join(value);
  });
  return result;
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
    // Alegra solo acepta "in" (ingreso) u "out" (egreso). "received" da 4007.
    type: "in",
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
      (lineItem?.variant_id as string | number | undefined) || (refundItem.variant_id as string | number | undefined);
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
      observations: payload.order_id ? `Devolucion Shopify ${payload.order_id}` : "Devolucion Shopify",
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
    observations: payload.order_id ? `Devolucion Shopify ${payload.order_id}` : "Devolucion Shopify",
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
  const destinationMode = storeConfig.transferDestinationMode || "fixed";
  const destinationRequired = storeConfig.transferDestinationRequired !== false;
  const destinationId = storeConfig.transferDestinationWarehouseId;
  const strategy = storeConfig.transferStrategy || "manual";
  let originIds = storeConfig.transferOriginWarehouseIds || [];
  if (strategy !== "manual") {
    try {
      const warehouses = (await ctx.alegra.listWarehouses()) as Array<{ id?: string | number }>;
      originIds = warehouses.map((warehouse) => String(warehouse?.id || "")).filter(Boolean);
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

  if (!originIds.length) {
    const decision = {
      ...shouldBlock("missing_transfer_config", {
        destinationId,
        destinationMode,
        destinationRequired,
        originIds,
        strategy,
      }),
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "failed", decision.reason);
    }
    return decision;
  }

  if (transferEnabled && destinationRequired && !destinationId) {
    const decision = {
      ...shouldBlock("missing_transfer_destination", {
        destinationId,
        destinationMode,
        destinationRequired,
        originIds,
        strategy,
      }),
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
        warehouses: Array.isArray(detail?.inventory?.warehouses) ? detail.inventory.warehouses : [],
      };
    })
  );

  const minStock = typeof storeConfig.transferMinStock === "number" ? storeConfig.transferMinStock : 0;
  const tieBreakRule = storeConfig.transferTieBreakRule || "";
  const priorityId = await resolvePriorityWarehouseId(ctx, storeConfig);

  const allocations: Array<{
    alegraId: string;
    sku?: string;
    quantity: number;
    warehouseId: string;
  }> = [];
  const missingStock: Array<{
    alegraId: string;
    sku?: string;
    needed: number;
    candidates: Array<{ warehouseId: string; available: number }>;
  }> = [];

  const getEffectiveAvailable = (item: (typeof inventoryByItem)[number], warehouseId: string) => {
    const entry = item.warehouses.find((warehouse) => String(warehouse?.id) === String(warehouseId));
    const raw = Number(entry?.availableQuantity || 0);
    const effective = raw - minStock;
    return Number.isFinite(effective) && effective > 0 ? effective : 0;
  };

  const pickWarehouseForItem = (candidates: Array<{ warehouseId: string; available: number }>): string => {
    if (!candidates.length) return "";
    const sorted = [...candidates].sort((a, b) => b.available - a.available);
    const top = sorted[0]?.available ?? 0;
    const tied = sorted.filter((item) => item.available === top);
    if (strategy === "priority" && priorityId) {
      const preferred = tied.find((item) => String(item.warehouseId) === String(priorityId));
      if (preferred) return preferred.warehouseId;
    }
    if (tieBreakRule === "priority" && priorityId) {
      const preferred = tied.find((item) => String(item.warehouseId) === String(priorityId));
      if (preferred) return preferred.warehouseId;
    }
    return sorted[0].warehouseId;
  };

  for (const item of inventoryByItem) {
    const candidates = originIds
      .map((warehouseId) => ({
        warehouseId,
        available: getEffectiveAvailable(item, warehouseId),
      }))
      .filter((candidate) => candidate.available >= item.quantity);
    const chosenWarehouseId = pickWarehouseForItem(candidates);
    if (!chosenWarehouseId) {
      missingStock.push({
        alegraId: item.alegraId,
        sku: item.sku,
        needed: item.quantity,
        candidates: originIds.map((warehouseId) => ({
          warehouseId,
          available: getEffectiveAvailable(item, warehouseId),
        })),
      });
      continue;
    }
    allocations.push({
      alegraId: item.alegraId,
      sku: item.sku,
      quantity: item.quantity,
      warehouseId: chosenWarehouseId,
    });
  }

  if (missingStock.length) {
    const decision = {
      ...shouldBlock("insufficient_stock", {
        destinationId,
        destinationMode,
        destinationRequired,
        strategy,
        minStock,
        tieBreakRule,
        priorityId,
        missingStock,
      }),
    };
    await recordTransferDecision(pool, orgId, shopDomain, orderId, decision);
    if (transferKey) {
      await markIdempotencyKey(transferKey, "failed", decision.reason);
    }
    return decision;
  }

  const byOrigin = new Map<string, Array<{ id: number; quantity: number }>>();
  allocations.forEach((allocation) => {
    const list = byOrigin.get(allocation.warehouseId) || [];
    list.push({ id: Number(allocation.alegraId), quantity: allocation.quantity });
    byOrigin.set(allocation.warehouseId, list);
  });

  const chosenWarehouseId =
    allocations
      .map((allocation) => allocation.warehouseId)
      .reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {}) || {};
  const chosenWarehouseIdResolved = Object.entries(chosenWarehouseId).sort((a, b) => b[1] - a[1])[0]?.[0];

  await recordTransferDecision(pool, orgId, shopDomain, orderId, {
    blocked: false,
    reason: "allocation_ok",
    chosenWarehouseId: chosenWarehouseIdResolved,
    rule: "allocation_ok",
    details: {
      destinationId,
      destinationMode,
      destinationRequired,
      strategy,
      minStock,
      tieBreakRule,
      priorityId,
      allocations,
      originsUsed: Array.from(byOrigin.keys()),
    },
  });

  if (!transferEnabled) {
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_disabled",
      chosenWarehouseId: chosenWarehouseIdResolved,
      rule: "transfer_disabled",
    };
  }

  if (!destinationId) {
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_skipped_no_destination",
      chosenWarehouseId: chosenWarehouseIdResolved,
      rule: "transfer_skipped_no_destination",
    };
  }

  const transfers = Array.from(byOrigin.entries())
    .filter(([originId]) => String(originId) !== String(destinationId))
    .map(([originId, transferItems]) => ({
      originId,
      transferItems,
    }));

  if (!transfers.length) {
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_skipped",
      chosenWarehouseId: chosenWarehouseIdResolved,
      rule: "transfer_skipped",
    };
  }

  try {
    for (const transfer of transfers) {
      const transferPayload = {
        date: new Date().toISOString().slice(0, 10),
        observations: payload.name ? `Traslado Shopify ${payload.name}` : "Traslado Shopify",
        warehouseFrom: { id: Number(transfer.originId) },
        warehouseTo: { id: Number(destinationId) },
        items: transfer.transferItems,
      };
      await ctx.alegra.createInventoryTransfer(transferPayload);
    }
    if (transferKey) {
      await markIdempotencyKey(transferKey, "completed");
    }
    return {
      blocked: false,
      reason: "transfer_ok",
      chosenWarehouseId: chosenWarehouseIdResolved,
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
      await markIdempotencyKey(transferKey, "failed", (error as { message?: string })?.message || "transfer_failed");
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
