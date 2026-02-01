import { AlegraClient } from "../connectors/alegra";
import { ShopifyClient } from "../connectors/shopify";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { decryptString } from "../utils/crypto";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../db";
import { resolveStoreConfig } from "./store-config.service";
import { getStoreConfigForDomain } from "./store-configs.service";

type SyncContext = {
  shopify: ShopifyClient;
  alegra: AlegraClient;
  shopifyLocationId?: string;
  publishOnStock: boolean;
  onlyActiveItems: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
  alegraWarehouseId?: string;
  alegraWarehouseIds?: string[];
  priceListGeneralId?: string;
  priceListDiscountId?: string;
  priceListWholesaleId?: string;
  priceListCurrency?: string;
};

type InventoryRules = {
  publishOnStock: boolean;
  onlyActiveItems?: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
  warehouseIds: string[];
};

const normalizeAutoStatus = (value: unknown): "draft" | "active" =>
  value === "active" ? "active" : "draft";

export async function buildSyncContext(shopDomain?: string): Promise<SyncContext> {
  const pool = getPool();
  const orgId = getOrgId();

  const shopifySettings = await loadShopifySettings(pool, orgId, shopDomain);
  const alegraSettings = await loadAlegraSettings(pool, orgId, shopDomain);
  const storeDomain = shopDomain || shopifySettings?.shopDomain || "";
  const storeConfig = await resolveStoreConfig(storeDomain || null);
  const storeConfigFull = storeDomain ? await getStoreConfigForDomain(storeDomain) : null;
  const rules = storeConfigFull?.rules || (await loadInventoryRules(pool, orgId));
  const warehouseId = await loadWarehouseId(pool, orgId);

  if (!shopifySettings?.shopDomain || !shopifySettings?.accessToken) {
    throw new Error("Missing Shopify credentials in DB");
  }
  if (!alegraSettings?.email || !alegraSettings?.apiKey) {
    throw new Error("Missing Alegra credentials in DB");
  }

  const resolvedDomain = String(shopifySettings.shopDomain)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return {
    shopify: new ShopifyClient({
      shopDomain: resolvedDomain,
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
    onlyActiveItems: Boolean(rules.onlyActiveItems),
    autoPublishOnWebhook: rules.autoPublishOnWebhook,
    autoPublishStatus: normalizeAutoStatus(rules.autoPublishStatus),
    alegraWarehouseId: warehouseId,
    alegraWarehouseIds: rules.warehouseIds,
    priceListGeneralId: storeConfig.priceListGeneralId,
    priceListDiscountId: storeConfig.priceListDiscountId,
    priceListWholesaleId: storeConfig.priceListWholesaleId,
    priceListCurrency: storeConfig.currency,
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

async function loadShopifySettings(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  shopDomain?: string
) {
  if (shopDomain) {
    const domain = normalizeShopDomain(shopDomain);
    const store = await pool.query<{
      shop_domain: string;
      access_token_encrypted: string;
    }>(
      `
      SELECT shop_domain, access_token_encrypted
      FROM shopify_stores
      WHERE organization_id = $1 AND shop_domain = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, domain]
    );
    if (store.rows.length) {
      const decrypted = JSON.parse(decryptString(store.rows[0].access_token_encrypted));
      return {
        shopDomain: store.rows[0].shop_domain,
        accessToken: decrypted.accessToken,
      } as ProviderSettings;
    }
  }
  return loadCredential(pool, orgId, "shopify");
}

async function loadAlegraSettings(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  shopDomain?: string
) {
  if (shopDomain) {
    const domain = normalizeShopDomain(shopDomain);
    const result = await pool.query<{
      alegra_account_id: number | null;
      user_email: string | null;
      api_key_encrypted: string | null;
      environment: string | null;
    }>(
      `
      SELECT c.alegra_account_id,
             a.user_email,
             a.api_key_encrypted,
             a.environment
      FROM shopify_store_configs c
      LEFT JOIN alegra_accounts a
        ON a.id = c.alegra_account_id
      WHERE c.organization_id = $1 AND c.shop_domain = $2
      ORDER BY c.created_at DESC
      LIMIT 1
      `,
      [orgId, domain]
    );
    if (result.rows.length && result.rows[0].user_email && result.rows[0].api_key_encrypted) {
      const decrypted = JSON.parse(decryptString(result.rows[0].api_key_encrypted));
      return {
        email: result.rows[0].user_email,
        apiKey: decrypted.apiKey,
        environment: result.rows[0].environment || "prod",
      } as ProviderSettings;
    }
  }
  return loadCredential(pool, orgId, "alegra");
}

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

async function loadInventoryRules(
  pool: ReturnType<typeof getPool>,
  orgId: number
): Promise<InventoryRules> {
  await ensureInventoryRulesColumns(pool);
  const result = await pool.query<{
    publish_on_stock: boolean;
    auto_publish_on_webhook: boolean;
    auto_publish_status: string | null;
    warehouse_ids: string | null;
  }>(
    `
    SELECT publish_on_stock, auto_publish_on_webhook, auto_publish_status, warehouse_ids
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
      warehouseIds: [],
    };
  }
  return {
    publishOnStock: result.rows[0].publish_on_stock,
    autoPublishOnWebhook: result.rows[0].auto_publish_on_webhook,
    autoPublishStatus: result.rows[0].auto_publish_status === "active" ? "active" : "draft",
    warehouseIds: normalizeWarehouseIds(result.rows[0].warehouse_ids),
  };
}

function normalizeWarehouseIds(value?: string | null) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
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
