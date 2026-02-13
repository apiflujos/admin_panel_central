import { buildSyncContext } from "./sync-context";
import { getMappingByShopifyId } from "./mapping.service";
import { ensureInvoiceSettingsColumns, getPool, getOrgId } from "../db";
import type { ShopifyOrder } from "../connectors/shopify";

export async function emitPaymentForOrder(orderId: string) {
  const ctx = await buildSyncContext();
  const mapping = await getMappingByShopifyId("order", orderId);
  if (!mapping?.alegraId) {
    return { status: "missing_invoice" };
  }

  const invoice = (await ctx.alegra.getInvoice(mapping.alegraId)) as {
    client?: { id?: string | number };
    total?: number | string;
    amount?: number | string;
  };
  const clientId = invoice.client?.id ? String(invoice.client.id) : undefined;
  const amount = Number(invoice.total ?? invoice.amount ?? 0);
  if (!clientId || !amount) {
    return { status: "missing_invoice_data" };
  }

  const pool = getPool();
  const orgId = getOrgId();
  const invoiceSettings = await loadInvoiceSettings(pool, orgId);
  if (!invoiceSettings.applyPayment) {
    return { status: "payment_disabled" };
  }
  if (!invoiceSettings.bankAccountId) {
    return { status: "missing_bank_account" };
  }

  const orderInfo = await resolveOrderPaymentGateways(ctx, orderId);
  const sourceMapping = await resolvePaymentMappingBySource(pool, orgId, orderInfo.gateways);
  const paymentMethod = sourceMapping?.paymentMethod || invoiceSettings.paymentMethod;
  const bankAccountId =
    sourceMapping?.accountId ||
    (await resolveBankAccountId(pool, orgId, paymentMethod, invoiceSettings.bankAccountId));

  const paymentPayload = {
    date: new Date().toISOString().slice(0, 10),
    bankAccount: Number(bankAccountId),
    client: Number(clientId),
    amount,
    paymentMethod: paymentMethod || "transfer",
    invoices: [
      {
        id: Number(mapping.alegraId),
        amount,
      },
    ],
    observations: interpolateObservations(
      invoiceSettings.observationsTemplate,
      orderId,
      orderInfo.orderName,
      orderInfo.email
    ) || undefined,
    type: "received",
  };

  const result = await ctx.alegra.createPayment(paymentPayload);
  return { status: "created", result };
}

export async function voidInvoiceForOrder(orderId: string) {
  const ctx = await buildSyncContext();
  const mapping = await getMappingByShopifyId("order", orderId);
  if (!mapping?.alegraId) {
    return { status: "missing_invoice" };
  }

  const result = await ctx.alegra.updateInvoice(mapping.alegraId, { status: "void" });
  return { status: "voided", result };
}

type InvoiceSettings = {
  paymentMethod: string;
  bankAccountId: string;
  observationsTemplate: string;
  applyPayment: boolean;
};

async function loadInvoiceSettings(pool: ReturnType<typeof getPool>, orgId: number): Promise<InvoiceSettings> {
  await ensureInvoiceSettingsColumns(pool);
  const result = await pool.query<{
    payment_method: string | null;
    bank_account_id: string | null;
    observations_template: string | null;
    apply_payment: boolean | null;
  }>(
    `
    SELECT payment_method, bank_account_id, observations_template, apply_payment
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return { paymentMethod: "", bankAccountId: "", observationsTemplate: "", applyPayment: false };
  }
  const row = result.rows[0];
  return {
    paymentMethod: row.payment_method || "",
    bankAccountId: row.bank_account_id || "",
    observationsTemplate: row.observations_template || "",
    applyPayment: Boolean(row.apply_payment),
  };
}

async function resolveBankAccountId(
  pool: ReturnType<typeof getPool>,
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

async function resolveOrderPaymentGateways(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  orderId: string
) {
  try {
    const data = (await ctx.shopify.getOrderById(orderId)) as { order: ShopifyOrder };
    const order = data?.order;
    if (!order) return { gateways: [], orderName: "", email: "" };
    return {
      gateways: Array.isArray(order.paymentGatewayNames)
        ? order.paymentGatewayNames.filter(Boolean)
        : [],
      orderName: order.name || "",
      email: order.email || order.customer?.email || "",
    };
  } catch {
    return { gateways: [], orderName: "", email: "" };
  }
}

async function resolvePaymentMappingBySource(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  sourceMethods: string[]
) {
  if (!sourceMethods.length) return null;
  const normalized = sourceMethods.map((method) => method.trim().toLowerCase());
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

function interpolateObservations(
  template: string,
  orderId: string,
  orderName?: string,
  email?: string
) {
  if (!template) return undefined;
  return template
    .replace("{{order.id}}", orderId)
    .replace("{{order.name}}", orderName || "")
    .replace("{{customer.email}}", email || "");
}
