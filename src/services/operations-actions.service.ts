import { buildSyncContext } from "./sync-context";
import { getMappingByShopifyId } from "./mapping.service";
import { ensureInvoiceSettingsColumns, getPool, getOrgId } from "../db";

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
  if (!invoiceSettings.bankAccountId) {
    return { status: "missing_bank_account" };
  }

  const bankAccountId = await resolveBankAccountId(
    pool,
    orgId,
    invoiceSettings.paymentMethod,
    invoiceSettings.bankAccountId
  );

  const paymentPayload = {
    date: new Date().toISOString().slice(0, 10),
    bankAccount: Number(bankAccountId),
    client: Number(clientId),
    amount,
    paymentMethod: invoiceSettings.paymentMethod || "transfer",
    invoices: [
      {
        id: Number(mapping.alegraId),
        amount,
      },
    ],
    observations: invoiceSettings.observationsTemplate || undefined,
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
};

async function loadInvoiceSettings(pool: ReturnType<typeof getPool>, orgId: number): Promise<InvoiceSettings> {
  await ensureInvoiceSettingsColumns(pool);
  const result = await pool.query<{
    payment_method: string | null;
    bank_account_id: string | null;
    observations_template: string | null;
  }>(
    `
    SELECT payment_method, bank_account_id, observations_template
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return { paymentMethod: "", bankAccountId: "", observationsTemplate: "" };
  }
  const row = result.rows[0];
  return {
    paymentMethod: row.payment_method || "",
    bankAccountId: row.bank_account_id || "",
    observationsTemplate: row.observations_template || "",
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
    WHERE organization_id = $1 AND method_id = $2
    LIMIT 1
    `,
    [orgId, paymentMethod]
  );
  if (result.rows.length) {
    return result.rows[0].account_id;
  }
  return defaultBankAccountId;
}
