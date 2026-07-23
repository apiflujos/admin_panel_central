import type { PoolClient } from "pg";

import { encryptString, decryptString } from "../utils/crypto";
import { isValidShopDomain } from "./shopify-oauth.service";
import { testAlegra, testShopify } from "./connectivity.service";
import { ensureOrganization, getOrgId, getPool } from "../db";
import { listWooConnections } from "./woocommerce-connections.service";

type AlegraAccountInput = {
  accountId?: number;
  email?: string;
  apiKey?: string;
  environment?: "sandbox" | "prod";
  storeId?: number;
};

type ShopifyStoreInput = {
  shopDomain: string;
  accessToken: string;
  locationId?: string;
  apiVersion?: string;
  storeName?: string;
  scopes?: string;
  alegra?: AlegraAccountInput;
  storeId?: number;
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
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.", {
        cause: error,
      });
    }
    throw new Error("No se pudo validar la conexion de Shopify. Vuelve a conectar Shopify para esta tienda.", {
      cause: error,
    });
  }
  const token = String((decrypted as { accessToken?: string } | null)?.accessToken || "").trim();
  if (!token) {
    throw new Error("Access token Shopify requerido");
  }
  const locationId = String((decrypted as { locationId?: string } | null)?.locationId || "").trim();
  const apiVersion = String((decrypted as { apiVersion?: string } | null)?.apiVersion || "").trim();
  return {
    shopDomain: row.shop_domain,
    accessToken: token,
    ...(locationId ? { locationId } : {}),
    ...(apiVersion ? { apiVersion } : {}),
  };
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
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.", {
        cause: error,
      });
    }
    throw new Error(`Reconecta Alegra para ${normalized}. (Clave guardada antigua o invalida)`, { cause: error });
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

export async function getAlegraConnectionByStoreId(storeId: number) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda requerido");
  }
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{
    user_email: string | null;
    api_key_encrypted: string | null;
    environment: string | null;
  }>(
    `
    SELECT user_email, api_key_encrypted, environment
    FROM alegra_accounts
    WHERE organization_id = $1 AND store_id = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, storeId]
  );
  if (!result.rows.length) {
    throw new Error("Alegra no conectado para esta tienda.");
  }
  const row = result.rows[0];
  if (!row?.user_email || !row?.api_key_encrypted) {
    throw new Error("Alegra no conectado para esta tienda.");
  }
  let decrypted: unknown;
  try {
    decrypted = JSON.parse(decryptString(row.api_key_encrypted));
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.", {
        cause: error,
      });
    }
    throw new Error("No se pudo obtener la configuracion de la tienda.", { cause: error });
  }
  const apiKey = String((decrypted as { apiKey?: string } | null)?.apiKey || "").trim();
  if (!apiKey) {
    throw new Error("Reconecta Alegra para esta tienda. (Clave vacia)");
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

  const storesCatalogRows = await pool.query<{
    id: number;
    name: string;
    created_at: string;
  }>(
    `
    SELECT id, name, created_at
    FROM stores
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );

  const fallbackStoreId = storesCatalogRows.rows[0]?.id ? Number(storesCatalogRows.rows[0].id) : null;
  const resolveOrCreateStoreId = async (name: string) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    const existing = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM stores
      WHERE organization_id = $1 AND name = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, trimmed]
    );
    if (existing.rows.length) return existing.rows[0].id;
    const created = await pool.query<{ id: number }>(
      `
      INSERT INTO stores (organization_id, name)
      VALUES ($1, $2)
      RETURNING id
      `,
      [orgId, trimmed]
    );
    return created.rows[0]?.id || null;
  };
  {
    // No more implicit UPDATE alegra_accounts SET store_id = <first store> on every list call —
    // orphans stay orphan until the operator explicitly links them via the wizard.
  }
  const missingShopify = await pool.query<{
    id: number;
    store_name: string | null;
    shop_domain: string;
  }>(
    `
    SELECT id, store_name, shop_domain
    FROM shopify_stores
    WHERE organization_id = $1 AND store_id IS NULL
    `,
    [orgId]
  );
  for (const row of missingShopify.rows) {
    const resolved =
      (await resolveOrCreateStoreId(row.store_name || "")) ||
      (await resolveOrCreateStoreId(row.shop_domain || "")) ||
      fallbackStoreId ||
      null;
    if (!resolved) continue;
    await pool.query(
      `
      UPDATE shopify_stores
      SET store_id = $1
      WHERE id = $2
      `,
      [resolved, row.id]
    );
  }

  let stores = await pool.query<{
    id: number;
    shop_domain: string;
    store_name: string | null;
    access_token_encrypted: string | null;
    created_at: string;
    store_id: number | null;
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
           s.store_id,
           COALESCE(c.alegra_account_id, st.alegra_account_id) AS alegra_account_id,
           a.user_email,
           a.environment,
           a.api_key_encrypted AS alegra_api_key_encrypted
    FROM shopify_stores s
    LEFT JOIN stores st
      ON st.id = s.store_id AND st.organization_id = s.organization_id
    LEFT JOIN shopify_store_configs c
      ON c.organization_id = s.organization_id
     AND c.shop_domain = s.shop_domain
    LEFT JOIN alegra_accounts a
      ON a.id = COALESCE(c.alegra_account_id, st.alegra_account_id)
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
      store_id: number | null;
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
             s.store_id,
             COALESCE(c.alegra_account_id, st.alegra_account_id) AS alegra_account_id,
             a.user_email,
             a.environment,
             a.api_key_encrypted AS alegra_api_key_encrypted
      FROM shopify_stores s
      LEFT JOIN stores st
        ON st.id = s.store_id AND st.organization_id = s.organization_id
      LEFT JOIN shopify_store_configs c
        ON c.organization_id = s.organization_id
       AND c.shop_domain = s.shop_domain
      LEFT JOIN alegra_accounts a
        ON a.id = COALESCE(c.alegra_account_id, st.alegra_account_id)
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
    store_id: number | null;
  }>(
    `
    SELECT id, user_email, api_key_encrypted, environment, created_at, store_id
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
    storeId: row.store_id || undefined,
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
    storeId: row.store_id || undefined,
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

  const wooData = (await listWooConnections().catch(() => ({ stores: [] }))) as {
    stores: Array<{
      storeId?: number;
      shopDomain: string;
      storeName?: string;
      hasConsumerKey?: boolean;
      hasConsumerSecret?: boolean;
    }>;
  };
  const wooByStore = new Map<number, { shopDomain: string; storeName: string; ok: boolean }>();
  wooData.stores.forEach((store) => {
    const storeId = Number(store.storeId);
    if (!Number.isFinite(storeId)) return;
    const ok = Boolean(store.hasConsumerKey && store.hasConsumerSecret);
    wooByStore.set(storeId, { shopDomain: store.shopDomain, storeName: store.storeName || "", ok });
  });

  const shopifyByStore = new Map<number, (typeof mappedStores)[number]>();
  mappedStores.forEach((store) => {
    const storeId = Number((store as { storeId?: number }).storeId);
    if (!Number.isFinite(storeId)) return;
    shopifyByStore.set(storeId, store);
  });

  const alegraByStore = new Map<number, (typeof mappedAlegraAccounts)[number]>();
  mappedAlegraAccounts.forEach((account) => {
    const storeId = Number(account.storeId);
    if (!Number.isFinite(storeId)) return;
    alegraByStore.set(storeId, account);
  });

  const storesCatalog = storesCatalogRows.rows.map((store) => {
    const shopify = shopifyByStore.get(store.id);
    const alegra = alegraByStore.get(store.id);
    const woo = wooByStore.get(store.id);
    return {
      id: store.id,
      name: store.name,
      createdAt: store.created_at,
      shopify,
      alegra,
      woo,
    };
  });

  return {
    securityMisconfigured,
    stores: mappedStores,
    alegraAccounts: mappedAlegraAccounts,
    googleAds,
    metaAds,
    tiktokAds,
    storesCatalog,
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
    ON CONFLICT (organization_id, provider) DO UPDATE SET data_encrypted = EXCLUDED.data_encrypted, updated_at = NOW()
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
    ON CONFLICT (organization_id, provider) DO UPDATE SET data_encrypted = EXCLUDED.data_encrypted, updated_at = NOW()
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
    ON CONFLICT (organization_id, provider) DO UPDATE SET data_encrypted = EXCLUDED.data_encrypted, updated_at = NOW()
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
  let storeName = input.storeName?.trim() || null;
  const providedStoreId = Number.isFinite(input.storeId as number) ? Number(input.storeId) : null;
  const scopes = input.scopes?.trim() || null;
  if (!shopDomain) {
    throw new Error("Dominio Shopify requerido");
  }
  if (!isValidShopDomain(shopDomain)) {
    throw new Error("Dominio Shopify invalido");
  }
  let resolvedStoreId = providedStoreId;
  if (resolvedStoreId) {
    const store = await pool.query<{ id: number; name: string }>(
      `
      SELECT id, name
      FROM stores
      WHERE organization_id = $1 AND id = $2
      LIMIT 1
      `,
      [orgId, resolvedStoreId]
    );
    if (!store.rows.length) {
      throw new Error("Tienda no encontrada");
    }
    storeName = store.rows[0].name;
  } else {
    const desiredName = storeName || shopDomain;
    const existingStore = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM stores
      WHERE organization_id = $1 AND name = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, desiredName]
    );
    if (existingStore.rows.length) {
      resolvedStoreId = existingStore.rows[0].id;
    } else {
      const createdStore = await pool.query<{ id: number }>(
        `
        INSERT INTO stores (organization_id, name)
        VALUES ($1, $2)
        RETURNING id
        `,
        [orgId, desiredName]
      );
      resolvedStoreId = createdStore.rows[0]?.id || null;
    }
    storeName = desiredName;
  }
  const trimmedToken = input.accessToken?.trim() || "";
  if (trimmedToken) {
    try {
      await testShopify({
        shopDomain,
        accessToken: trimmedToken,
        apiVersion: input.apiVersion || undefined,
      });
    } catch (error) {
      const upstream = error instanceof Error ? error.message : "";
      throw new Error(
        `Shopify rechazó las credenciales antes de guardar. ${upstream ? `Detalle: ${upstream}` : ""}`.trim()
      );
    }
  }
  const encryptedPayload = {
    accessToken: trimmedToken,
    locationId: String(input.locationId || "").trim() || undefined,
    apiVersion: String(input.apiVersion || "").trim() || undefined,
  };
  const accessTokenEncrypted = trimmedToken ? encryptString(JSON.stringify(encryptedPayload)) : null;

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
          scopes = COALESCE($3, scopes),
          store_id = COALESCE($5, store_id)
      WHERE id = $4
      `,
      [accessTokenEncrypted, storeName, scopes, storeId, resolvedStoreId]
    );
  } else {
    if (!accessTokenEncrypted) {
      throw new Error("Access token Shopify requerido");
    }
    const created = await pool.query<{ id: number }>(
      `
      INSERT INTO shopify_stores (organization_id, shop_domain, store_name, access_token_encrypted, scopes, store_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [orgId, shopDomain, storeName, accessTokenEncrypted, scopes || "", resolvedStoreId]
    );
    storeId = created.rows[0]?.id;
    isNew = true;
  }

  const alegraAccountId = await resolveAlegraAccountId(pool, orgId, {
    ...input.alegra,
    storeId: resolvedStoreId || input.alegra?.storeId,
  });

  if (alegraAccountId) {
    await upsertStoreConfig(pool, orgId, shopDomain, alegraAccountId, resolvedStoreId);
  }

  return { storeId, shopDomain, alegraAccountId, isNew, storeIdRef: resolvedStoreId || null };
}

type DeleteStoreConnectionOptions = {
  purgeData?: boolean;
};

/**
 * Resolve the catalog `store_id` (stores.id) for a Shopify shop domain within
 * the current org context. Returns null when the shop is unknown or not linked
 * to a catalog store. Used to resolve per-store webhook credentials.
 */
export async function getStoreIdByShopDomain(shopDomain: string): Promise<number | null> {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = normalizeShopDomain(shopDomain || "");
  if (!normalized) return null;
  const res = await pool.query<{ store_id: number | null }>(
    `
    SELECT store_id
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, normalized]
  );
  const storeId = Number(res.rows[0]?.store_id);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}

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

export async function listConnectedShopifyDomains() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const res = await pool.query<{ shop_domain: string }>(
    `
    SELECT DISTINCT shop_domain
    FROM shopify_stores
    WHERE organization_id = $1
      AND shop_domain IS NOT NULL
      AND BTRIM(shop_domain) <> ''
      AND access_token_encrypted IS NOT NULL
    ORDER BY shop_domain ASC
    `,
    [orgId]
  );
  return res.rows.map((row) => normalizeShopDomain(row.shop_domain)).filter(Boolean);
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

async function purgeMarketingStoreData(pool: PoolClient | ReturnType<typeof getPool>, orgId: number, shopDomain: string) {
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

async function purgeStoreData(pool: PoolClient | ReturnType<typeof getPool>, orgId: number, shopDomain: string) {
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Always purge marketing rows for this shop (prevents stale dashboards and webhook noise).
    await purgeMarketingStoreData(client, orgId, shopDomain);

    if (options.purgeData) {
      await purgeStoreData(client, orgId, shopDomain);
    } else {
      await client.query(
        `
        DELETE FROM shopify_oauth_states
        WHERE organization_id = $1 AND shop_domain = $2
        `,
        [orgId, shopDomain]
      );
      await client.query(
        `
        DELETE FROM shopify_store_configs
        WHERE organization_id = $1 AND shop_domain = $2
        `,
        [orgId, shopDomain]
      );
    }

    await client.query(
      `
      DELETE FROM shopify_stores
      WHERE id = $1 AND organization_id = $2
      `,
      [storeId, orgId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function resolveAlegraAccountId(pool: ReturnType<typeof getPool>, orgId: number, input?: AlegraAccountInput) {
  if (!input) return undefined;
  const storeId = Number.isFinite(input.storeId as number) ? Number(input.storeId) : null;
  if (input.accountId) {
    if (!storeId) {
      const existing = await pool.query<{ store_id: number | null }>(
        `
        SELECT store_id
        FROM alegra_accounts
        WHERE organization_id = $1 AND id = $2
        LIMIT 1
        `,
        [orgId, input.accountId]
      );
      const currentStoreId = existing.rows[0]?.store_id || null;
      if (!currentStoreId) {
        throw new Error(
          "Alegra debe estar asociado a una tienda. Reabre el wizard y elige la tienda antes de guardar."
        );
      }
    }
    const apiKey = input.apiKey?.trim();
    if (apiKey) {
      const emailForTest = input.email?.trim();
      if (emailForTest) {
        try {
          await testAlegra({
            email: emailForTest,
            apiKey,
            environment: input.environment,
          });
        } catch (error) {
          const upstream = error instanceof Error ? error.message : "";
          throw new Error(
            `Alegra rechazó las credenciales antes de guardar. ${upstream ? `Detalle: ${upstream}` : ""}`.trim()
          );
        }
      }
      const encrypted = encryptString(JSON.stringify({ apiKey }));
      // store_id sólo se setea si aún está vacío (primer vínculo). No se "mueve"
      // para no romper otra tienda que comparta la misma cuenta.
      await pool.query(
        `
        UPDATE alegra_accounts
        SET api_key_encrypted = $1,
            store_id = COALESCE(store_id, $4)
        WHERE organization_id = $2 AND id = $3
        `,
        [encrypted, orgId, input.accountId, storeId]
      );
    }
    // Vínculo por-tienda (compartible): varias tiendas pueden apuntar a la misma
    // cuenta Alegra sin quitársela a las demás.
    if (storeId) {
      await pool.query(
        `
        UPDATE stores
        SET alegra_account_id = $1
        WHERE organization_id = $2 AND id = $3
        `,
        [input.accountId, orgId, storeId]
      );
    }
    return input.accountId;
  }
  const email = input.email?.trim();
  const apiKey = input.apiKey?.trim();
  if (!email || !apiKey) return undefined;
  if (!storeId) {
    throw new Error("Selecciona una tienda para conectar Alegra.");
  }
  const environment = input.environment === "sandbox" ? "sandbox" : "prod";

  try {
    await testAlegra({ email, apiKey, environment });
  } catch (error) {
    const upstream = error instanceof Error ? error.message : "";
    throw new Error(
      `Alegra rechazó las credenciales antes de guardar. ${upstream ? `Detalle: ${upstream}` : ""}`.trim()
    );
  }

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
      SET api_key_encrypted = $1,
          store_id = COALESCE($3, store_id)
      WHERE id = $2
      `,
      [encrypted, existing.rows[0].id, storeId]
    );
    return existing.rows[0].id;
  }

  const created = await pool.query<{ id: number }>(
    `
    INSERT INTO alegra_accounts (organization_id, user_email, api_key_encrypted, environment, store_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [orgId, email, encrypted, environment, storeId]
  );
  return created.rows[0]?.id;
}

export async function deleteAlegraAccountByStoreId(storeId: number) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda invalido");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const result = await pool.query(
    `
    DELETE FROM alegra_accounts
    WHERE organization_id = $1 AND store_id = $2
    `,
    [orgId, storeId]
  );
  return { deleted: (result.rowCount || 0) > 0 };
}

export async function upsertAlegraAccount(input?: AlegraAccountInput) {
  if (!input) return { accountId: undefined as number | undefined };
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const accountId = await resolveAlegraAccountId(pool, orgId, input);
  return { accountId };
}

async function upsertStoreConfig(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  shopDomain: string,
  alegraAccountId: number,
  storeId?: number | null
) {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM shopify_store_configs
    WHERE organization_id = $1
      AND (
        (store_id IS NOT NULL AND store_id = $2)
        OR (store_id IS NULL AND shop_domain = $3)
      )
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, storeId || null, shopDomain]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE shopify_store_configs
      SET alegra_account_id = $1,
          store_id = COALESCE($3, store_id)
      WHERE id = $2
      `,
      [alegraAccountId, existing.rows[0].id, storeId]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO shopify_store_configs (organization_id, shop_domain, alegra_account_id, store_id)
    VALUES ($1, $2, $3, $4)
    `,
    [orgId, shopDomain, alegraAccountId, storeId || null]
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

  let shopify: Record<string, unknown>;
  let alegra: Record<string, unknown>;
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
  if (!String(alegra?.email || "").trim() || !String(alegra?.apiKey || "").trim()) return;

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

  const env = String(alegra.environment || "prod") === "sandbox" ? "sandbox" : "prod";
  const alegraAccountId = await resolveAlegraAccountId(pool, orgId, {
    email: String(alegra.email || ""),
    apiKey: String(alegra.apiKey || ""),
    environment: env as "sandbox" | "prod",
  });
  if (alegraAccountId) {
    await upsertStoreConfig(pool, orgId, shopDomain, alegraAccountId);
  }
}
