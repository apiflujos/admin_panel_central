import { AlegraClient } from "../connectors/alegra";
import { ShopifyClient } from "../connectors/shopify";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { decryptString } from "../utils/crypto";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../db";

type SyncContext = {
  shopify: ShopifyClient;
  alegra: AlegraClient;
  shopifyLocationId?: string;
  publishOnStock: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
  alegraWarehouseId?: string;
};

type InventoryRules = {
  publishOnStock: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
};

export async function buildSyncContext(): Promise<SyncContext> {
  const pool = getPool();
  const orgId = getOrgId();

  const shopifySettings = await loadCredential(pool, orgId, "shopify");
  const alegraSettings = await loadCredential(pool, orgId, "alegra");
  const rules = await loadInventoryRules(pool, orgId);
  const warehouseId = await loadWarehouseId(pool, orgId);

  if (!shopifySettings?.shopDomain || !shopifySettings?.accessToken) {
    throw new Error("Missing Shopify credentials in DB");
  }
  if (!alegraSettings?.email || !alegraSettings?.apiKey) {
    throw new Error("Missing Alegra credentials in DB");
  }

  const shopDomain = String(shopifySettings.shopDomain)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return {
    shopify: new ShopifyClient({
      shopDomain,
      accessToken: shopifySettings.accessToken,
      apiVersion: shopifySettings.apiVersion,
    }),
    alegra: new AlegraClient({
      email: alegraSettings.email,
      apiKey: alegraSettings.apiKey,
      baseUrl: getAlegraBaseUrl(alegraSettings.environment),
    }),
    shopifyLocationId: shopifySettings.locationId,
    publishOnStock: rules.publishOnStock,
    autoPublishOnWebhook: rules.autoPublishOnWebhook,
    autoPublishStatus: rules.autoPublishStatus,
    alegraWarehouseId: warehouseId,
  };
}

type ProviderSettings = Record<string, string | undefined>;

async function loadCredential(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  provider: string
): Promise<ProviderSettings | null> {
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
  return JSON.parse(decrypted) as ProviderSettings;
}

async function loadInventoryRules(
  pool: ReturnType<typeof getPool>,
  orgId: number
): Promise<InventoryRules> {
  await ensureInventoryRulesColumns(pool);
  const result = await pool.query<{
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
  if (!result.rows.length) {
    return {
      publishOnStock: true,
      autoPublishOnWebhook: true,
      autoPublishStatus: "draft" as const,
    };
  }
  return {
    publishOnStock: result.rows[0].publish_on_stock,
    autoPublishOnWebhook: result.rows[0].auto_publish_on_webhook,
    autoPublishStatus: result.rows[0].auto_publish_status === "active" ? "active" : "draft",
  };
}

async function loadWarehouseId(pool: ReturnType<typeof getPool>, orgId: number) {
  const result = await pool.query<{ warehouse_id: string | null }>(
    `
    SELECT warehouse_id
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return result.rows[0].warehouse_id || undefined;
}
