import { encryptString, decryptString } from "../utils/crypto";
import { isValidShopDomain } from "./shopify-oauth.service";
import { ensureOrganization, getOrgId, getPool } from "../db";

type AlegraAccountInput = {
  accountId?: number;
  email?: string;
  apiKey?: string;
  environment?: "sandbox" | "prod";
};

type ShopifyStoreInput = {
  shopDomain: string;
  accessToken: string;
  storeName?: string;
  scopes?: string;
  alegra?: AlegraAccountInput;
};

const GOOGLE_ADS_PROVIDER = "google_ads";
const META_ADS_PROVIDER = "meta_ads";
const TIKTOK_ADS_PROVIDER = "tiktok_ads";

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const isCryptoKeyMisconfigured = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("CRYPTO_KEY_BASE64 must be 32 bytes") ||
    message.includes("CRYPTO_KEY_BASE64") ||
    message.toLowerCase().includes("invalid key length")
  );
};

export async function getShopifyConnectionByDomain(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = normalizeShopDomain(shopDomain || "");
  if (!normalized) {
    throw new Error("Dominio Shopify requerido");
  }
  const result = await pool.query<{
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
    [orgId, normalized]
  );
  const row = result.rows[0];
  if (!row?.access_token_encrypted) {
    throw new Error("Conexion Shopify no encontrada");
  }
  let decrypted: unknown;
  try {
    decrypted = JSON.parse(decryptString(row.access_token_encrypted));
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.");
    }
    throw new Error("No se pudo validar la conexion de Shopify. Vuelve a conectar Shopify para esta tienda.");
  }
  const token = String((decrypted as { accessToken?: string } | null)?.accessToken || "").trim();
  if (!token) {
    throw new Error("Access token Shopify requerido");
  }
  return { shopDomain: row.shop_domain, accessToken: token };
}

export async function getAlegraConnectionByDomain(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = normalizeShopDomain(shopDomain || "");
  if (!normalized) {
    throw new Error("Dominio Shopify requerido");
  }
  const result = await pool.query<{
    user_email: string | null;
    api_key_encrypted: string | null;
    environment: string | null;
  }>(
    `
    SELECT a.user_email,
           a.api_key_encrypted,
           a.environment
    FROM shopify_store_configs c
    LEFT JOIN alegra_accounts a
      ON a.id = c.alegra_account_id
    WHERE c.organization_id = $1 AND c.shop_domain = $2
    ORDER BY c.created_at DESC
    LIMIT 1
    `,
    [orgId, normalized]
  );
  if (!result.rows.length) {
    throw new Error(`Alegra no conectado para ${normalized}.`);
  }
  const row = result.rows[0];
  if (!row?.user_email || !row?.api_key_encrypted) {
    throw new Error(`Alegra no conectado para ${normalized}.`);
  }
  let decrypted: unknown;
  try {
    decrypted = JSON.parse(decryptString(row.api_key_encrypted));
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.");
    }
    throw new Error(`Reconecta Alegra para ${normalized}. (Clave guardada antigua o invalida)`);
  }
  const apiKey = String((decrypted as { apiKey?: string } | null)?.apiKey || "").trim();
  if (!apiKey) {
    throw new Error(`Reconecta Alegra para ${normalized}. (Clave vacia)`);
  }
  return {
    email: String(row.user_email).trim(),
    apiKey,
    environment: row.environment === "sandbox" ? "sandbox" : "prod",
  } as { email: string; apiKey: string; environment: "sandbox" | "prod" };
}

export async function listStoreConnections() {
  const pool = getPool();
  const orgId = getOrgId();
  let securityMisconfigured = false;

  let stores = await pool.query<{
    id: number;
    shop_domain: string;
    store_name: string | null;
    access_token_encrypted: string | null;
    created_at: string;
    alegra_account_id: number | null;
    user_email: string | null;
    environment: string | null;
    alegra_api_key_encrypted: string | null;
  }>(
    `
    SELECT s.id,
           s.shop_domain,
           s.store_name,
           s.access_token_encrypted,
           s.created_at,
           c.alegra_account_id,
           a.user_email,
           a.environment,
           a.api_key_encrypted AS alegra_api_key_encrypted
    FROM shopify_stores s
    LEFT JOIN shopify_store_configs c
      ON c.organization_id = s.organization_id
     AND c.shop_domain = s.shop_domain
    LEFT JOIN alegra_accounts a
      ON a.id = c.alegra_account_id
    WHERE s.organization_id = $1
    ORDER BY s.created_at DESC
    `,
    [orgId]
  );

  if (!stores.rows.length) {
    await seedFromLegacyCredentials(pool, orgId);
    stores = await pool.query<{
      id: number;
      shop_domain: string;
      store_name: string | null;
      access_token_encrypted: string | null;
      created_at: string;
      alegra_account_id: number | null;
      user_email: string | null;
      environment: string | null;
      alegra_api_key_encrypted: string | null;
    }>(
      `
      SELECT s.id,
             s.shop_domain,
             s.store_name,
             s.access_token_encrypted,
             s.created_at,
             c.alegra_account_id,
             a.user_email,
             a.environment,
             a.api_key_encrypted AS alegra_api_key_encrypted
      FROM shopify_stores s
      LEFT JOIN shopify_store_configs c
        ON c.organization_id = s.organization_id
       AND c.shop_domain = s.shop_domain
      LEFT JOIN alegra_accounts a
        ON a.id = c.alegra_account_id
      WHERE s.organization_id = $1
      ORDER BY s.created_at DESC
      `,
      [orgId]
    );
  }

  const alegraAccounts = await pool.query<{
    id: number;
    user_email: string;
    api_key_encrypted: string | null;
    environment: string | null;
    created_at: string;
  }>(
    `
    SELECT id, user_email, api_key_encrypted, environment, created_at
    FROM alegra_accounts
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );

  const mappedStores = stores.rows.map((row) => ({
      id: row.id,
      shopDomain: row.shop_domain,
      storeName: row.store_name || "",
      ...(() => {
        let shopifyConnected = false;
        let shopifyNeedsReconnect = false;
        if (row.access_token_encrypted) {
          try {
            const decrypted = JSON.parse(decryptString(row.access_token_encrypted)) as {
              accessToken?: string;
            };
            shopifyConnected = Boolean(String(decrypted?.accessToken || "").trim());
          } catch (error) {
            if (isCryptoKeyMisconfigured(error)) {
              securityMisconfigured = true;
              shopifyConnected = false;
              shopifyNeedsReconnect = true;
            } else {
              shopifyConnected = false;
              shopifyNeedsReconnect = true;
            }
          }
        }

        let alegraConnected = false;
        let alegraNeedsReconnect = false;
        if (row.alegra_account_id) {
          if (row.alegra_api_key_encrypted) {
            try {
              const decrypted = JSON.parse(decryptString(row.alegra_api_key_encrypted)) as {
                apiKey?: string;
              };
              alegraConnected = Boolean(String(decrypted?.apiKey || "").trim());
            } catch (error) {
              if (isCryptoKeyMisconfigured(error)) {
                securityMisconfigured = true;
                alegraConnected = false;
                alegraNeedsReconnect = true;
              } else {
                alegraConnected = false;
                alegraNeedsReconnect = true;
              }
            }
          } else {
            alegraConnected = false;
            alegraNeedsReconnect = true;
          }
        }

        const status = !row.access_token_encrypted
          ? "Pendiente"
          : shopifyNeedsReconnect
            ? "Reconectar Shopify"
            : "Conectado";

        return { status, shopifyConnected, shopifyNeedsReconnect, alegraConnected, alegraNeedsReconnect };
      })(),
      alegraAccountId: row.alegra_account_id || undefined,
      alegraEmail: row.user_email || "",
      alegraEnvironment: row.environment || "prod",
    }));

  const mappedAlegraAccounts = alegraAccounts.rows.map((row) => ({
      id: row.id,
      email: row.user_email,
      environment: row.environment || "prod",
      needsReconnect: (() => {
        if (!row.api_key_encrypted) return true;
        try {
          const decrypted = JSON.parse(decryptString(row.api_key_encrypted)) as { apiKey?: string };
          return !String(decrypted?.apiKey || "").trim();
        } catch (error) {
          if (isCryptoKeyMisconfigured(error)) {
            securityMisconfigured = true;
            return true;
          }
          return true;
        }
      })(),
  }));

  const googleAds = await readGoogleAdsSummary(pool, orgId).catch((error: unknown) => {
    if (isCryptoKeyMisconfigured(error)) {
      securityMisconfigured = true;
    }
    return { connected: false, needsReconnect: true, customerId: "" };
  });
  const metaAds = await readMetaAdsSummary(pool, orgId).catch((error: unknown) => {
    if (isCryptoKeyMisconfigured(error)) {
      securityMisconfigured = true;
    }
    return { connected: false, needsReconnect: true, adAccountId: "" };
  });
  const tiktokAds = await readTikTokAdsSummary(pool, orgId).catch((error: unknown) => {
    if (isCryptoKeyMisconfigured(error)) {
      securityMisconfigured = true;
    }
    return { connected: false, needsReconnect: true, advertiserId: "" };
  });

  return {
    securityMisconfigured,
    stores: mappedStores,
    alegraAccounts: mappedAlegraAccounts,
    googleAds,
    metaAds,
    tiktokAds,
  };
}

export async function upsertGoogleAdsCredentials(input: {
  refreshToken: string;
  accessToken: string;
  expiresAt: string;
  customerId: string;
  shopDomain: string;
  loginCustomerId?: string | null;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const payload = {
    refreshToken: String(input.refreshToken || "").trim(),
    accessToken: String(input.accessToken || "").trim(),
    expiresAt: String(input.expiresAt || "").trim(),
    customerId: String(input.customerId || "").trim(),
    shopDomain: String(input.shopDomain || "").trim(),
    loginCustomerId: input.loginCustomerId ? String(input.loginCustomerId).trim() : "",
  };
  if (!payload.refreshToken) {
    throw new Error("Google Ads refresh token requerido");
  }
  if (!payload.customerId) {
    throw new Error("Google Ads customerId requerido");
  }
  if (!payload.shopDomain) {
    throw new Error("Google Ads shopDomain requerido");
  }
  const encrypted = encryptString(JSON.stringify(payload));
  await pool.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, GOOGLE_ADS_PROVIDER, encrypted]
  );
  return payload;
}

export async function readGoogleAdsCredentials(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, GOOGLE_ADS_PROVIDER]
  );
  if (!res.rows.length) return null;
  const decrypted = decryptString(res.rows[0].data_encrypted);
  return JSON.parse(decrypted) as {
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: string;
    customerId?: string;
    shopDomain?: string;
    loginCustomerId?: string;
  };
}

async function readGoogleAdsSummary(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, GOOGLE_ADS_PROVIDER]
  );
  if (!res.rows.length) {
    return { connected: false, needsReconnect: false, customerId: "" };
  }
  try {
    const decrypted = decryptString(res.rows[0].data_encrypted);
    const payload = JSON.parse(decrypted) as { refreshToken?: string; customerId?: string; shopDomain?: string };
    const connected = Boolean(String(payload?.refreshToken || "").trim());
    return {
      connected,
      needsReconnect: !connected,
      customerId: String(payload?.customerId || "").trim(),
      shopDomain: String(payload?.shopDomain || "").trim(),
    };
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw error;
    }
    return { connected: false, needsReconnect: true, customerId: "" };
  }
}

export async function upsertMetaAdsCredentials(input: {
  accessToken: string;
  expiresAt: string;
  adAccountId: string;
  shopDomain: string;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const payload = {
    accessToken: String(input.accessToken || "").trim(),
    expiresAt: String(input.expiresAt || "").trim(),
    adAccountId: String(input.adAccountId || "").trim(),
    shopDomain: String(input.shopDomain || "").trim(),
  };
  if (!payload.accessToken) {
    throw new Error("Meta Ads access token requerido");
  }
  if (!payload.adAccountId) {
    throw new Error("Meta Ads adAccountId requerido");
  }
  if (!payload.shopDomain) {
    throw new Error("Meta Ads shopDomain requerido");
  }
  const encrypted = encryptString(JSON.stringify(payload));
  await pool.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, META_ADS_PROVIDER, encrypted]
  );
  return payload;
}

export async function readMetaAdsCredentials(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, META_ADS_PROVIDER]
  );
  if (!res.rows.length) return null;
  const decrypted = decryptString(res.rows[0].data_encrypted);
  return JSON.parse(decrypted) as {
    accessToken?: string;
    expiresAt?: string;
    adAccountId?: string;
    shopDomain?: string;
  };
}

async function readMetaAdsSummary(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, META_ADS_PROVIDER]
  );
  if (!res.rows.length) {
    return { connected: false, needsReconnect: false, adAccountId: "" };
  }
  try {
    const decrypted = decryptString(res.rows[0].data_encrypted);
    const payload = JSON.parse(decrypted) as { accessToken?: string; adAccountId?: string; shopDomain?: string };
    const connected = Boolean(String(payload?.accessToken || "").trim());
    return {
      connected,
      needsReconnect: !connected,
      adAccountId: String(payload?.adAccountId || "").trim(),
      shopDomain: String(payload?.shopDomain || "").trim(),
    };
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw error;
    }
    return { connected: false, needsReconnect: true, adAccountId: "" };
  }
}

export async function upsertTikTokAdsCredentials(input: {
  accessToken: string;
  advertiserId: string;
  shopDomain: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const payload = {
    accessToken: String(input.accessToken || "").trim(),
    advertiserId: String(input.advertiserId || "").trim(),
    shopDomain: String(input.shopDomain || "").trim(),
    refreshToken: input.refreshToken ? String(input.refreshToken).trim() : "",
    expiresAt: input.expiresAt ? String(input.expiresAt).trim() : "",
  };
  if (!payload.accessToken) {
    throw new Error("TikTok Ads access token requerido");
  }
  if (!payload.advertiserId) {
    throw new Error("TikTok Ads advertiserId requerido");
  }
  if (!payload.shopDomain) {
    throw new Error("TikTok Ads shopDomain requerido");
  }
  const encrypted = encryptString(JSON.stringify(payload));
  await pool.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, TIKTOK_ADS_PROVIDER, encrypted]
  );
  return payload;
}

export async function readTikTokAdsCredentials(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, TIKTOK_ADS_PROVIDER]
  );
  if (!res.rows.length) return null;
  const decrypted = decryptString(res.rows[0].data_encrypted);
  return JSON.parse(decrypted) as {
    accessToken?: string;
    advertiserId?: string;
    shopDomain?: string;
    refreshToken?: string;
    expiresAt?: string;
  };
}

async function readTikTokAdsSummary(pool: ReturnType<typeof getPool>, orgId: number) {
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, TIKTOK_ADS_PROVIDER]
  );
  if (!res.rows.length) {
    return { connected: false, needsReconnect: false, advertiserId: "" };
  }
  try {
    const decrypted = decryptString(res.rows[0].data_encrypted);
    const payload = JSON.parse(decrypted) as { accessToken?: string; advertiserId?: string; shopDomain?: string };
    const connected = Boolean(String(payload?.accessToken || "").trim());
    return {
      connected,
      needsReconnect: !connected,
      advertiserId: String(payload?.advertiserId || "").trim(),
      shopDomain: String(payload?.shopDomain || "").trim(),
    };
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw error;
    }
    return { connected: false, needsReconnect: true, advertiserId: "" };
  }
}

export async function upsertStoreConnection(input: ShopifyStoreInput) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);

  const shopDomain = normalizeShopDomain(input.shopDomain || "");
  const storeName = input.storeName?.trim() || null;
  const scopes = input.scopes?.trim() || null;
  if (!shopDomain) {
    throw new Error("Dominio Shopify requerido");
  }
  if (!isValidShopDomain(shopDomain)) {
    throw new Error("Dominio Shopify invalido");
  }
  const trimmedToken = input.accessToken?.trim() || "";
  const accessTokenEncrypted = trimmedToken
    ? encryptString(JSON.stringify({ accessToken: trimmedToken }))
    : null;

  const existingStore = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, shopDomain]
  );

  let storeId = existingStore.rows[0]?.id;
  let isNew = false;
  if (storeId) {
    await pool.query(
      `
      UPDATE shopify_stores
      SET access_token_encrypted = COALESCE($1, access_token_encrypted),
          store_name = COALESCE($2, store_name),
          scopes = COALESCE($3, scopes)
      WHERE id = $4
      `,
      [accessTokenEncrypted, storeName, scopes, storeId]
    );
  } else {
    if (!accessTokenEncrypted) {
      throw new Error("Access token Shopify requerido");
    }
    const created = await pool.query<{ id: number }>(
      `
      INSERT INTO shopify_stores (organization_id, shop_domain, store_name, access_token_encrypted, scopes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [orgId, shopDomain, storeName, accessTokenEncrypted, scopes || ""]
    );
    storeId = created.rows[0]?.id;
    isNew = true;
  }

  const alegraAccountId = await resolveAlegraAccountId(pool, orgId, input.alegra);

  if (alegraAccountId) {
    await upsertStoreConfig(pool, orgId, shopDomain, alegraAccountId);
  }

  return { storeId, shopDomain, alegraAccountId, isNew };
}

type DeleteStoreConnectionOptions = {
  purgeData?: boolean;
};

export async function shopifyStoreExists(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const normalized = normalizeShopDomain(shopDomain || "");
  if (!normalized) return false;
  const res = await pool.query<{ ok: number }>(
    `
    SELECT 1 as ok
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    LIMIT 1
    `,
    [orgId, normalized]
  );
  return res.rows.length > 0;
}

export async function deleteStoreConnectionByDomain(shopDomain: string, options: DeleteStoreConnectionOptions = {}) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const normalized = normalizeShopDomain(shopDomain || "");
  if (!normalized) {
    throw new Error("Dominio Shopify requerido");
  }
  const store = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, normalized]
  );
  const storeId = store.rows[0]?.id;
  if (!storeId) {
    return { deleted: false as const };
  }
  await deleteStoreConnection(storeId, options);
  return { deleted: true as const, storeId };
}

async function purgeMarketingStoreData(pool: ReturnType<typeof getPool>, orgId: number, shopDomain: string) {
  await pool.query(
    `
    DELETE FROM marketing.alerts
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.alert_rules
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.order_items
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.attribution_events
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.daily_metrics
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.campaign_spend
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.campaigns
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.traffic_sources
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.orders
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.products
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.customers
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.webhook_receipts
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.sync_state
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM marketing.shops
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
}

async function purgeStoreData(pool: ReturnType<typeof getPool>, orgId: number, shopDomain: string) {
  await pool.query(
    `
    DELETE FROM inventory_transfer_decisions
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM products
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM orders
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM contacts
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM shopify_oauth_states
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
  await pool.query(
    `
    DELETE FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
}

export async function deleteStoreConnection(storeId: number, options: DeleteStoreConnectionOptions = {}) {
  const pool = getPool();
  const orgId = getOrgId();

  const store = await pool.query<{ shop_domain: string }>(
    `
    SELECT shop_domain
    FROM shopify_stores
    WHERE id = $1 AND organization_id = $2
    `,
    [storeId, orgId]
  );

  if (!store.rows.length) {
    return;
  }

  const shopDomain = store.rows[0].shop_domain;

  await pool.query("BEGIN");
  try {
    // Always purge marketing rows for this shop (prevents stale dashboards and webhook noise).
    await purgeMarketingStoreData(pool, orgId, shopDomain);

    if (options.purgeData) {
      await purgeStoreData(pool, orgId, shopDomain);
    } else {
      await pool.query(
        `
        DELETE FROM shopify_oauth_states
        WHERE organization_id = $1 AND shop_domain = $2
        `,
        [orgId, shopDomain]
      );
      await pool.query(
        `
        DELETE FROM shopify_store_configs
        WHERE organization_id = $1 AND shop_domain = $2
        `,
        [orgId, shopDomain]
      );
    }

    await pool.query(
      `
      DELETE FROM shopify_stores
      WHERE id = $1 AND organization_id = $2
      `,
      [storeId, orgId]
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function resolveAlegraAccountId(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  input?: AlegraAccountInput
) {
  if (!input) return undefined;
  if (input.accountId) {
    const apiKey = input.apiKey?.trim();
    if (apiKey) {
      const encrypted = encryptString(JSON.stringify({ apiKey }));
      await pool.query(
        `
        UPDATE alegra_accounts
        SET api_key_encrypted = $1
        WHERE organization_id = $2 AND id = $3
        `,
        [encrypted, orgId, input.accountId]
      );
    }
    return input.accountId;
  }
  const email = input.email?.trim();
  const apiKey = input.apiKey?.trim();
  if (!email || !apiKey) return undefined;
  const environment = input.environment === "sandbox" ? "sandbox" : "prod";

  const existing = await pool.query<{ id: number; api_key_encrypted: string }>(
    `
    SELECT id, api_key_encrypted
    FROM alegra_accounts
    WHERE organization_id = $1 AND user_email = $2 AND environment = $3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, email, environment]
  );

  const encrypted = encryptString(JSON.stringify({ apiKey }));
  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE alegra_accounts
      SET api_key_encrypted = $1
      WHERE id = $2
      `,
      [encrypted, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const created = await pool.query<{ id: number }>(
    `
    INSERT INTO alegra_accounts (organization_id, user_email, api_key_encrypted, environment)
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `,
    [orgId, email, encrypted, environment]
  );
  return created.rows[0]?.id;
}

async function upsertStoreConfig(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  shopDomain: string,
  alegraAccountId: number
) {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, shopDomain]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE shopify_store_configs
      SET alegra_account_id = $1
      WHERE id = $2
      `,
      [alegraAccountId, existing.rows[0].id]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO shopify_store_configs (organization_id, shop_domain, alegra_account_id)
    VALUES ($1, $2, $3)
    `,
    [orgId, shopDomain, alegraAccountId]
  );
}

async function seedFromLegacyCredentials(pool: ReturnType<typeof getPool>, orgId: number) {
  const creds = await pool.query<{ provider: string; data_encrypted: string }>(
    `
    SELECT provider, data_encrypted
    FROM credentials
    WHERE organization_id = $1
    `,
    [orgId]
  );
  const shopifyCred = creds.rows.find((row) => row.provider === "shopify");
  const alegraCred = creds.rows.find((row) => row.provider === "alegra");
  if (!shopifyCred || !alegraCred) return;

  let shopify: any;
  let alegra: any;
  try {
    shopify = JSON.parse(decryptString(shopifyCred.data_encrypted));
    alegra = JSON.parse(decryptString(alegraCred.data_encrypted));
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw error;
    }
    return;
  }
  if (!shopify?.shopDomain || !shopify?.accessToken) return;
  if (!alegra?.email || !alegra?.apiKey) return;

  const shopDomain = normalizeShopDomain(String(shopify.shopDomain));
  const accessTokenEncrypted = encryptString(JSON.stringify({ accessToken: shopify.accessToken }));
  await pool.query(
    `
    INSERT INTO shopify_stores (organization_id, shop_domain, store_name, access_token_encrypted, scopes)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
    `,
    [orgId, shopDomain, null, accessTokenEncrypted, ""]
  );

  const env = alegra.environment === "sandbox" ? "sandbox" : "prod";
  const alegraAccountId = await resolveAlegraAccountId(pool, orgId, {
    email: alegra.email,
    apiKey: alegra.apiKey,
    environment: env,
  });
  if (alegraAccountId) {
    await upsertStoreConfig(pool, orgId, shopDomain, alegraAccountId);
  }
}
