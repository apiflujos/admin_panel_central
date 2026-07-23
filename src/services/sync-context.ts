import { AlegraClient } from "../connectors/alegra";
import { ShopifyClient } from "../connectors/shopify";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { decryptString } from "../utils/crypto";
import { ensureInventoryRulesColumns, getOrgId, getPool } from "../db";
import { resolveStoreConfig } from "./store-config.service";
import { getStoreConfigForDomain } from "./store-configs.service";

const isCryptoKeyMisconfigured = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("CRYPTO_KEY_BASE64 must be 32 bytes");
};

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

type SyncContext = {
  shopify: ShopifyClient;
  alegra: AlegraClient;
  shopDomain: string;
  storeId?: number;
  shopifyLocationId?: string;
  webhookItemsEnabled: boolean;
  syncEnabled: boolean;
  createInShopify: boolean;
  updateInShopify: boolean;
  publishOnStock: boolean;
  onlyActiveItems: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
  includeImages: boolean;
  trackInventory: boolean;
  allowOversell: boolean;
  alegraWarehouseId?: string;
  alegraWarehouseIds?: string[];
  priceListGeneralId?: string;
  priceListDiscountId?: string;
  priceListWholesaleId?: string;
  priceListCurrency?: string;
};

type InventoryRules = {
  webhookItemsEnabled?: boolean;
  syncEnabled?: boolean;
  createInShopify?: boolean;
  updateInShopify?: boolean;
  publishOnStock: boolean;
  includeImages?: boolean;
  trackInventory?: boolean;
  allowOversell?: boolean;
  onlyActiveItems?: boolean;
  autoPublishOnWebhook: boolean;
  autoPublishStatus: "draft" | "active";
  warehouseIds: string[];
};

const normalizeAutoStatus = (value: unknown): "draft" | "active" => (value === "active" ? "active" : "draft");

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
  const storeIdRow = await pool.query<{ store_id: number | null }>(
    `SELECT store_id FROM shopify_stores WHERE organization_id = $1 AND shop_domain = $2 ORDER BY created_at DESC LIMIT 1`,
    [orgId, resolvedDomain]
  );
  const resolvedStoreId =
    storeIdRow.rows[0]?.store_id != null && Number.isFinite(Number(storeIdRow.rows[0].store_id))
      ? Number(storeIdRow.rows[0].store_id)
      : undefined;
  const shopify = new ShopifyClient({
    shopDomain: resolvedDomain,
    accessToken: shopifySettings.accessToken,
    apiVersion: shopifySettings.apiVersion,
  });
  const resolvedLocationId =
    String(shopifySettings.locationId || "").trim() || (await shopify.getPrimaryLocationId().catch(() => ""));

  return {
    shopify,
    alegra: new AlegraClient({
      email: alegraSettings.email,
      apiKey: alegraSettings.apiKey,
      baseUrl: getAlegraBaseUrl(alegraSettings.environment),
    }),
    shopDomain: resolvedDomain,
    storeId: resolvedStoreId,
    shopifyLocationId: resolvedLocationId || undefined,
    webhookItemsEnabled: (rules as InventoryRules).webhookItemsEnabled !== false,
    syncEnabled: rules.syncEnabled !== false,
    createInShopify: (rules as InventoryRules).createInShopify !== false,
    updateInShopify: (rules as InventoryRules).updateInShopify !== false,
    publishOnStock: rules.publishOnStock,
    includeImages: (rules as InventoryRules).includeImages !== false,
    trackInventory: (rules as InventoryRules).trackInventory !== false,
    allowOversell: (rules as InventoryRules).allowOversell === true,
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
  try {
    const decrypted = decryptString(result.rows[0].data_encrypted);
    return JSON.parse(decrypted) as ProviderSettings;
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) throw error;
    throw new Error(
      provider === "shopify"
        ? "Credenciales Shopify antiguas. Ve a Configuracion → Conexiones y reconecta Shopify."
        : "Credenciales Alegra antiguas. Ve a Configuracion → Conexiones y reconecta Alegra.",
      { cause: error }
    );
  }
}

async function loadShopifySettings(pool: ReturnType<typeof getPool>, orgId: number, shopDomain?: string) {
  if (shopDomain) {
    const domain = normalizeShopDomain(shopDomain);
    const store = await pool.query<{
      shop_domain: string;
      access_token_encrypted: string | null;
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
      const encrypted = store.rows[0].access_token_encrypted;
      if (!encrypted) {
        throw new Error(`Shopify no conectado para ${domain}. Ve a Configuracion → Conexiones y conecta Shopify.`);
      }
      try {
        const decrypted = JSON.parse(decryptString(encrypted));
        return {
          shopDomain: store.rows[0].shop_domain,
          accessToken: decrypted.accessToken,
          locationId: decrypted.locationId,
          apiVersion: decrypted.apiVersion,
        } as ProviderSettings;
      } catch (error) {
        if (isCryptoKeyMisconfigured(error)) throw error;
        throw new Error(`Reconecta Shopify para ${domain}. (Token guardado antiguo o invalido)`, { cause: error });
      }
    }
    throw new Error(`Shopify no conectado para ${domain}. Ve a Configuracion → Conexiones y conecta Shopify.`);
  }
  return loadCredential(pool, orgId, "shopify");
}

async function loadAlegraSettings(pool: ReturnType<typeof getPool>, orgId: number, shopDomain?: string) {
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
    let email = result.rows[0]?.user_email || null;
    let encrypted = result.rows[0]?.api_key_encrypted || null;
    let environment = result.rows[0]?.environment || null;

    // Fallback: cuenta compartida vía stores.alegra_account_id (dominio -> tienda
    // -> cuenta). Cubre el caso de una cuenta Alegra usada por varias tiendas,
    // donde shopify_store_configs.alegra_account_id no quedó seteado.
    if (!email || !encrypted) {
      const viaStore = await pool.query<{
        user_email: string | null;
        api_key_encrypted: string | null;
        environment: string | null;
      }>(
        `
        SELECT a.user_email, a.api_key_encrypted, a.environment
        FROM shopify_stores ss
        JOIN stores s ON s.id = ss.store_id
        JOIN alegra_accounts a ON a.id = s.alegra_account_id
        WHERE ss.organization_id = $1 AND ss.shop_domain = $2
        ORDER BY ss.created_at DESC
        LIMIT 1
        `,
        [orgId, domain]
      );
      if (viaStore.rows.length) {
        email = viaStore.rows[0].user_email;
        encrypted = viaStore.rows[0].api_key_encrypted;
        environment = viaStore.rows[0].environment;
      }
    }

    if (email && encrypted) {
      try {
        const decrypted = JSON.parse(decryptString(encrypted));
        return {
          email,
          apiKey: decrypted.apiKey,
          environment: environment || "prod",
        } as ProviderSettings;
      } catch (error) {
        if (isCryptoKeyMisconfigured(error)) throw error;
        throw new Error(`Reconecta Alegra para ${domain}. (Clave guardada antigua o invalida)`, { cause: error });
      }
    }
    throw new Error(`Alegra no conectado para ${domain}. Ve a Configuracion → Conexiones y conecta Alegra.`);
  }
  return loadCredential(pool, orgId, "alegra");
}

async function loadInventoryRules(pool: ReturnType<typeof getPool>, orgId: number): Promise<InventoryRules> {
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
      includeImages: true,
      warehouseIds: [],
    };
  }
  return {
    publishOnStock: result.rows[0].publish_on_stock,
    autoPublishOnWebhook: result.rows[0].auto_publish_on_webhook,
    autoPublishStatus: result.rows[0].auto_publish_status === "active" ? "active" : "draft",
    includeImages: true,
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
