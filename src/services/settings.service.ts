import { encryptString, decryptString } from "../utils/crypto";
import { ensureInvoiceSettingsColumns, ensureInventoryRulesColumns, ensureOrganization, getOrgId, getPool } from "../db";
import { AlegraClient } from "../connectors/alegra";
import { getAlegraBaseUrl } from "../utils/alegra-env";

type SettingsPayload = {
  shopify?: {
    shopDomain?: string;
    accessToken?: string;
    locationId?: string;
    apiVersion?: string;
  };
  alegra?: {
    email?: string;
    apiKey?: string;
    accountId?: string;
    environment?: "sandbox" | "prod";
  };
  ai?: {
    apiKey?: string;
  };
  rules?: {
    publishOnStock?: boolean;
    autoPublishOnWebhook?: boolean;
    autoPublishStatus?: "draft" | "active";
  };
  invoice?: {
    generateInvoice?: boolean;
    resolutionId?: string;
    warehouseId?: string;
    costCenterId?: string;
    sellerId?: string;
    paymentMethod?: string;
    bankAccountId?: string;
    applyPayment?: boolean;
    observationsTemplate?: string;
    einvoiceEnabled?: boolean;
  };
  taxRules?: Array<{
    shopifyTaxId: string;
    alegraTaxId: string;
    type: string;
  }>;
  paymentMappings?: Array<{
    methodId: string;
    accountId: string;
    methodLabel?: string;
    accountLabel?: string;
  }>;
};

export async function saveSettings(payload: SettingsPayload) {
  const pool = getPool();
  const orgId = getOrgId();

  await ensureOrganization(pool, orgId);

  if (payload.shopify) {
    const existingShopify = await readCredential(pool, orgId, "shopify");
    const accessToken = payload.shopify.accessToken?.trim()
      ? payload.shopify.accessToken
      : existingShopify?.accessToken;
    const data = encryptString(
      JSON.stringify({
        ...existingShopify,
        ...payload.shopify,
        accessToken,
      })
    );
    await upsertCredential(pool, orgId, "shopify", data);
  }
  if (payload.alegra) {
    const existingAlegra = await readCredential(pool, orgId, "alegra");
    const apiKey = payload.alegra.apiKey?.trim()
      ? payload.alegra.apiKey
      : existingAlegra?.apiKey;
    const data = encryptString(
      JSON.stringify({
        ...existingAlegra,
        ...payload.alegra,
        apiKey,
      })
    );
    await upsertCredential(pool, orgId, "alegra", data);
  }
  if (payload.ai) {
    const existingAi = await readCredential(pool, orgId, "ai");
    const apiKey = payload.ai.apiKey?.trim()
      ? payload.ai.apiKey
      : existingAi?.apiKey;
    const data = encryptString(
      JSON.stringify({
        ...existingAi,
        apiKey,
      })
    );
    await upsertCredential(pool, orgId, "ai", data);
  }

  if (payload.rules) {
    await upsertRules(pool, orgId, payload.rules);
  }
  if (payload.invoice) {
    await upsertInvoiceSettings(pool, orgId, payload.invoice);
  }

  if (payload.taxRules) {
    await replaceTaxRules(pool, orgId, payload.taxRules);
  }
  if (payload.paymentMappings) {
    await replacePaymentMappings(pool, orgId, payload.paymentMappings);
  }

  return { saved: true };
}

export async function getSettings() {
  const pool = getPool();
  const orgId = getOrgId();

  const shopify = await readCredential(pool, orgId, "shopify");
  const alegra = await readCredential(pool, orgId, "alegra");
  const ai = await readCredential(pool, orgId, "ai");
  const rules = await readRules(pool, orgId);
  const invoice = await readInvoiceSettings(pool, orgId);
  const taxRules = await readTaxRules(pool, orgId);
  const paymentMappings = await readPaymentMappings(pool, orgId);

  return {
    shopify: shopify
      ? {
          shopDomain: shopify.shopDomain || "",
          locationId: shopify.locationId || "",
          apiVersion: shopify.apiVersion || "",
          hasAccessToken: Boolean(shopify.accessToken),
        }
      : null,
    alegra: alegra
      ? {
          email: alegra.email || "",
          accountId: alegra.accountId || "",
          hasApiKey: Boolean(alegra.apiKey),
          environment: alegra.environment || "prod",
        }
      : null,
    ai: ai
      ? {
          hasApiKey: Boolean(ai.apiKey),
        }
      : null,
    rules,
    invoice,
    taxRules,
    paymentMappings,
  };
}

export async function listInvoiceResolutions() {
  try {
    const alegra = await getAlegraClient();
    const resolutions = await alegra.listInvoiceResolutions();
    return { items: resolutions || [] };
  } catch (error) {
    return { items: [], error: error.message || "No disponible" };
  }
}

export async function listAlegraCatalogItems(catalog: string) {
  try {
    const alegra = await getAlegraClient();
    switch (catalog) {
      case "warehouses":
        return { items: await alegra.listWarehouses() };
      case "cost-centers":
        return { items: await alegra.listCostCenters() };
      case "sellers":
        return { items: await alegra.listSellers() };
      case "payment-methods":
        return { items: await alegra.listPaymentMethods() };
      case "bank-accounts":
        return { items: await alegra.listBankAccounts() };
      default:
        return { items: [], error: "Catálogo no soportado" };
    }
  } catch (error) {
    return { items: [], error: error.message || "No disponible" };
  }
}

export async function getShopifyCredential() {
  const pool = getPool();
  const orgId = getOrgId();
  const shopify = await readCredential(pool, orgId, "shopify");
  if (!shopify?.shopDomain || !shopify?.accessToken) {
    throw new Error("Missing Shopify credentials in DB");
  }
  const cleanedDomain = String(shopify.shopDomain)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return {
    ...shopify,
    shopDomain: cleanedDomain,
  } as {
    shopDomain: string;
    accessToken: string;
    apiVersion?: string;
    locationId?: string;
  };
}

export async function getAlegraCredential() {
  const pool = getPool();
  const orgId = getOrgId();
  const alegra = await readCredential(pool, orgId, "alegra");
  if (!alegra?.email || !alegra?.apiKey) {
    throw new Error("Missing Alegra credentials in DB");
  }
  return alegra as {
    email: string;
    apiKey: string;
    environment?: "sandbox" | "prod";
  };
}

async function getAlegraClient() {
  const pool = getPool();
  const orgId = getOrgId();
  const alegra = await readCredential(pool, orgId, "alegra");
  if (!alegra?.email || !alegra?.apiKey) {
    throw new Error("Missing Alegra credentials in DB");
  }
  return new AlegraClient({
    email: alegra.email,
    apiKey: alegra.apiKey,
    baseUrl: getAlegraBaseUrl(alegra.environment),
  });
}

async function upsertCredential(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  provider: string,
  dataEncrypted: string
) {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, provider]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE credentials
      SET data_encrypted = $1
      WHERE id = $2
      `,
      [dataEncrypted, existing.rows[0].id]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, provider, dataEncrypted]
  );
}

async function upsertRules(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  rules: {
    publishOnStock?: boolean;
    autoPublishOnWebhook?: boolean;
    autoPublishStatus?: "draft" | "active";
  }
) {
  await ensureInventoryRulesColumns(pool);
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM inventory_rules
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE inventory_rules
      SET publish_on_stock = $1,
          auto_publish_on_webhook = $2,
          auto_publish_status = $3
      WHERE id = $4
      `,
      [
        rules.publishOnStock ?? true,
        rules.autoPublishOnWebhook ?? false,
        rules.autoPublishStatus === "active" ? "active" : "draft",
        existing.rows[0].id,
      ]
    );
  } else {
    await pool.query(
      `
      INSERT INTO inventory_rules (organization_id, publish_on_stock, auto_publish_on_webhook, auto_publish_status)
      VALUES ($1, $2, $3, $4)
      `,
      [
        orgId,
        rules.publishOnStock ?? true,
        rules.autoPublishOnWebhook ?? false,
        rules.autoPublishStatus === "active" ? "active" : "draft",
      ]
    );
  }

}

async function upsertInvoiceSettings(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  invoice: {
    generateInvoice?: boolean;
    resolutionId?: string;
    warehouseId?: string;
    costCenterId?: string;
    sellerId?: string;
    paymentMethod?: string;
    bankAccountId?: string;
    applyPayment?: boolean;
    observationsTemplate?: string;
    einvoiceEnabled?: boolean;
  }
) {
  await ensureInvoiceSettingsColumns(pool);
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE invoice_settings
      SET generate_invoice = $1,
          resolution_id = $2,
          warehouse_id = $3,
          cost_center_id = $4,
          seller_id = $5,
          payment_method = $6,
          bank_account_id = $7,
          apply_payment = $8,
          observations_template = $9,
          einvoice_enabled = $10
      WHERE id = $11
      `,
      [
        invoice.generateInvoice ?? false,
        invoice.resolutionId || null,
        invoice.warehouseId || null,
        invoice.costCenterId || null,
        invoice.sellerId || null,
        invoice.paymentMethod || null,
        invoice.bankAccountId || null,
        invoice.applyPayment ?? false,
        invoice.observationsTemplate || null,
        invoice.einvoiceEnabled ?? false,
        existing.rows[0].id,
      ]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO invoice_settings
      (organization_id, generate_invoice, resolution_id, warehouse_id, cost_center_id, seller_id, payment_method, bank_account_id, apply_payment, observations_template, einvoice_enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      orgId,
      invoice.generateInvoice ?? false,
      invoice.resolutionId || null,
      invoice.warehouseId || null,
      invoice.costCenterId || null,
      invoice.sellerId || null,
      invoice.paymentMethod || null,
      invoice.bankAccountId || null,
      invoice.applyPayment ?? false,
      invoice.observationsTemplate || null,
      invoice.einvoiceEnabled ?? false,
    ]
  );
}

async function replaceTaxRules(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  rules: Array<{ shopifyTaxId: string; alegraTaxId: string; type: string }>
) {
  await pool.query(
    `
    DELETE FROM tax_rules
    WHERE organization_id = $1
    `,
    [orgId]
  );

  for (const rule of rules) {
    await pool.query(
      `
      INSERT INTO tax_rules (organization_id, shopify_tax_id, alegra_tax_id, type)
      VALUES ($1, $2, $3, $4)
      `,
      [orgId, rule.shopifyTaxId, rule.alegraTaxId, rule.type]
    );
  }
}

async function readCredential(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  provider: string
) {
  const result = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, provider]
  );
  if (!result.rows.length) {
    return null;
  }
  const decrypted = decryptString(result.rows[0].data_encrypted);
  return JSON.parse(decrypted) as Record<string, string>;
}

async function readRules(pool: ReturnType<typeof getPool>, orgId: number) {
  await ensureInventoryRulesColumns(pool);
  const inventory = await pool.query<{
    publish_on_stock: boolean;
    auto_publish_on_webhook: boolean;
    auto_publish_status: string | null;
  }>(
    `
    SELECT publish_on_stock, auto_publish_on_webhook, auto_publish_status
    FROM inventory_rules
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  return {
    publishOnStock: inventory.rows.length ? inventory.rows[0].publish_on_stock : true,
    autoPublishOnWebhook: inventory.rows.length ? inventory.rows[0].auto_publish_on_webhook : true,
    autoPublishStatus: inventory.rows.length
      ? inventory.rows[0].auto_publish_status === "active"
        ? "active"
        : "draft"
      : "draft",
  };
}

async function readInvoiceSettings(pool: ReturnType<typeof getPool>, orgId: number) {
  await ensureInvoiceSettingsColumns(pool);
  const invoice = await pool.query<{
    generate_invoice: boolean;
    resolution_id: string | null;
    warehouse_id: string | null;
    cost_center_id: string | null;
    seller_id: string | null;
    payment_method: string | null;
    bank_account_id: string | null;
    apply_payment: boolean | null;
    observations_template: string | null;
    einvoice_enabled: boolean | null;
  }>(
    `
    SELECT generate_invoice, resolution_id, warehouse_id, cost_center_id, seller_id, payment_method, bank_account_id, apply_payment, observations_template, einvoice_enabled
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );

  if (!invoice.rows.length) {
    return {
      generateInvoice: false,
      resolutionId: "",
      warehouseId: "",
      costCenterId: "",
      sellerId: "",
      paymentMethod: "",
      bankAccountId: "",
      applyPayment: false,
      observationsTemplate: "",
      einvoiceEnabled: false,
    };
  }

  const row = invoice.rows[0];
  return {
    generateInvoice: row.generate_invoice,
    resolutionId: row.resolution_id || "",
    warehouseId: row.warehouse_id || "",
    costCenterId: row.cost_center_id || "",
    sellerId: row.seller_id || "",
    paymentMethod: row.payment_method || "",
    bankAccountId: row.bank_account_id || "",
    applyPayment: Boolean(row.apply_payment),
    observationsTemplate: row.observations_template || "",
    einvoiceEnabled: Boolean(row.einvoice_enabled),
  };
}

async function readTaxRules(pool: ReturnType<typeof getPool>, orgId: number) {
  const result = await pool.query<{
    shopify_tax_id: string;
    alegra_tax_id: string;
    type: string;
  }>(
    `
    SELECT shopify_tax_id, alegra_tax_id, type
    FROM tax_rules
    WHERE organization_id = $1
    `,
    [orgId]
  );
  return result.rows.map((row) => ({
    shopifyTaxId: row.shopify_tax_id,
    alegraTaxId: row.alegra_tax_id,
    type: row.type,
  }));
}

async function replacePaymentMappings(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  mappings: Array<{ methodId: string; accountId: string; methodLabel?: string; accountLabel?: string }>
) {
  await pool.query(
    `
    DELETE FROM payment_mappings
    WHERE organization_id = $1
    `,
    [orgId]
  );

  for (const mapping of mappings) {
    await pool.query(
      `
      INSERT INTO payment_mappings (organization_id, method_id, account_id, method_label, account_label)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [orgId, mapping.methodId, mapping.accountId, mapping.methodLabel || null, mapping.accountLabel || null]
    );
  }
}

async function readPaymentMappings(pool: ReturnType<typeof getPool>, orgId: number) {
  const result = await pool.query<{
    method_id: string;
    account_id: string;
    method_label: string | null;
    account_label: string | null;
  }>(
    `
    SELECT method_id, account_id, method_label, account_label
    FROM payment_mappings
    WHERE organization_id = $1
    `,
    [orgId]
  );
  return result.rows.map((row) => ({
    methodId: row.method_id,
    accountId: row.account_id,
    methodLabel: row.method_label || "",
    accountLabel: row.account_label || "",
  }));
}
