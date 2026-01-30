import { encryptString, decryptString } from "../utils/crypto";
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
  alegra?: AlegraAccountInput;
};

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

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
  const decrypted = JSON.parse(decryptString(row.access_token_encrypted));
  const token = String(decrypted?.accessToken || "").trim();
  if (!token) {
    throw new Error("Access token Shopify requerido");
  }
  return { shopDomain: row.shop_domain, accessToken: token };
}

export async function listStoreConnections() {
  const pool = getPool();
  const orgId = getOrgId();

  let stores = await pool.query<{
    id: number;
    shop_domain: string;
    store_name: string | null;
    access_token_encrypted: string;
    created_at: string;
    alegra_account_id: number | null;
    user_email: string | null;
    environment: string | null;
  }>(
    `
    SELECT s.id,
           s.shop_domain,
           s.store_name,
           s.access_token_encrypted,
           s.created_at,
           c.alegra_account_id,
           a.user_email,
           a.environment
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
      access_token_encrypted: string;
      created_at: string;
      alegra_account_id: number | null;
      user_email: string | null;
      environment: string | null;
    }>(
      `
      SELECT s.id,
             s.shop_domain,
             s.store_name,
             s.access_token_encrypted,
             s.created_at,
             c.alegra_account_id,
             a.user_email,
             a.environment
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
    environment: string | null;
    created_at: string;
  }>(
    `
    SELECT id, user_email, environment, created_at
    FROM alegra_accounts
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );

  return {
    stores: stores.rows.map((row) => ({
      id: row.id,
      shopDomain: row.shop_domain,
      storeName: row.store_name || "",
      status: row.access_token_encrypted ? "Conectado" : "Sin token",
      shopifyConnected: Boolean(row.access_token_encrypted),
      alegraConnected: Boolean(row.alegra_account_id),
      alegraAccountId: row.alegra_account_id || undefined,
      alegraEmail: row.user_email || "",
      alegraEnvironment: row.environment || "prod",
    })),
    alegraAccounts: alegraAccounts.rows.map((row) => ({
      id: row.id,
      email: row.user_email,
      environment: row.environment || "prod",
    })),
  };
}

export async function upsertStoreConnection(input: ShopifyStoreInput) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);

  const shopDomain = normalizeShopDomain(input.shopDomain || "");
  const storeName = input.storeName?.trim() || null;
  if (!shopDomain) {
    throw new Error("Dominio Shopify requerido");
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
          store_name = COALESCE($2, store_name)
      WHERE id = $3
      `,
      [accessTokenEncrypted, storeName, storeId]
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
      [orgId, shopDomain, storeName, accessTokenEncrypted, ""]
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

export async function deleteStoreConnection(storeId: number) {
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
  await pool.query(
    `
    DELETE FROM shopify_stores
    WHERE id = $1 AND organization_id = $2
    `,
    [storeId, orgId]
  );

  await pool.query(
    `
    DELETE FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, shopDomain]
  );
}

async function resolveAlegraAccountId(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  input?: AlegraAccountInput
) {
  if (!input) return undefined;
  if (input.accountId) {
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

  const shopify = JSON.parse(decryptString(shopifyCred.data_encrypted));
  const alegra = JSON.parse(decryptString(alegraCred.data_encrypted));
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
