import { getOrgId, getPool, runWithOrg } from "../db";
import { encryptString, decryptString } from "../utils/crypto";
import { verifyShopifyHmacWithSecret } from "../utils/webhook";
import { resolveOrgIdByShopDomain } from "./organizations.service";
import { getStoreIdByShopDomain } from "./store-connections.service";

const PROVIDER = "shopify_oauth_app";

/**
 * Provider key for a given scope: the global app credentials live under
 * `shopify_oauth_app`, and each store's own app credentials live under
 * `shopify_oauth_app:store:<storeId>`. This lets two Shopify stores that belong
 * to different organizations each carry their own Client ID/secret/scopes.
 */
function providerFor(storeId?: number | null): string {
  if (storeId != null && Number.isFinite(storeId) && Number(storeId) > 0) {
    return `${PROVIDER}:store:${Number(storeId)}`;
  }
  return PROVIDER;
}

export type ShopifyAppCredentials = {
  apiKey: string;
  apiSecret: string;
  scopes?: string;
};

/**
 * Read the Shopify OAuth app credentials (API key + secret + scopes) from the
 * `credentials` table for the current organization. When `storeId` is provided
 * it reads the per-store row (`shopify_oauth_app:store:<storeId>`); otherwise it
 * reads the global row (`shopify_oauth_app`). Returns null when there is no
 * stored row, when decryption/parsing fails, or when apiKey/apiSecret are
 * missing.
 */
export async function getShopifyAppCredentials(
  storeId?: number | null
): Promise<ShopifyAppCredentials | null> {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, providerFor(storeId)]
  );
  if (!result.rows.length) {
    return null;
  }
  try {
    const decrypted = decryptString(result.rows[0].data_encrypted);
    const parsed = JSON.parse(decrypted) as Partial<ShopifyAppCredentials>;
    const apiKey = String(parsed.apiKey || "").trim();
    const apiSecret = String(parsed.apiSecret || "").trim();
    if (!apiKey || !apiSecret) {
      return null;
    }
    const scopes = parsed.scopes ? String(parsed.scopes).trim() : undefined;
    return { apiKey, apiSecret, scopes };
  } catch {
    return null;
  }
}

/**
 * Persist the Shopify OAuth app credentials (encrypted) for the current
 * organization. When `storeId` is provided the credentials are stored per-store
 * (`shopify_oauth_app:store:<storeId>`); otherwise they are stored globally
 * (`shopify_oauth_app`). Upserts: updates the latest row when present, otherwise
 * inserts.
 */
export async function saveShopifyAppCredentials(
  input: ShopifyAppCredentials,
  storeId?: number | null
): Promise<void> {
  const apiKey = String(input.apiKey || "").trim();
  const apiSecret = String(input.apiSecret || "").trim();
  const scopes = input.scopes ? String(input.scopes).trim() : "";
  if (!apiKey) {
    throw new Error("apiKey es obligatorio");
  }
  if (!apiSecret) {
    throw new Error("apiSecret es obligatorio");
  }

  const pool = getPool();
  const orgId = getOrgId();
  const provider = providerFor(storeId);
  const dataEncrypted = encryptString(JSON.stringify({ apiKey, apiSecret, scopes }));

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

/**
 * Resolve the effective Shopify OAuth config with a per-field fallback chain:
 * per-store credentials (when `storeId` is given) → global DB credentials →
 * the SHOPIFY_API_KEY / SHOPIFY_API_SECRET / SHOPIFY_SCOPES environment
 * variables. All values are trimmed.
 */
export async function resolveShopifyOAuthConfig(storeId?: number | null): Promise<{
  apiKey: string;
  apiSecret: string;
  scopes: string;
}> {
  const fromStore =
    storeId != null ? await getShopifyAppCredentials(storeId).catch(() => null) : null;
  const fromGlobal = await getShopifyAppCredentials().catch(() => null);

  const envApiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const envApiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();
  const envScopes = String(process.env.SHOPIFY_SCOPES || "").trim();

  const apiKey =
    String(fromStore?.apiKey || "").trim() ||
    String(fromGlobal?.apiKey || "").trim() ||
    envApiKey;
  const apiSecret =
    String(fromStore?.apiSecret || "").trim() ||
    String(fromGlobal?.apiSecret || "").trim() ||
    envApiSecret;
  const scopes =
    String(fromStore?.scopes || "").trim() ||
    String(fromGlobal?.scopes || "").trim() ||
    envScopes;

  return { apiKey, apiSecret, scopes };
}

/**
 * Resolve the app secret used to verify incoming Shopify webhook HMACs for a
 * given store: per-store credentials → global DB credentials → env
 * (SHOPIFY_API_SECRET). Returns "" when nothing is configured. Callers should
 * keep SHOPIFY_WEBHOOK_SECRET as an additional fallback.
 */
export async function getShopifyAppSecretForStore(storeId?: number | null): Promise<string> {
  const { apiSecret } = await resolveShopifyOAuthConfig(storeId);
  return String(apiSecret || "").trim();
}

/**
 * Verify an incoming Shopify webhook HMAC using the store's own app secret.
 * Resolves the store by its shop domain (header `x-shopify-shop-domain`) →
 * catalog storeId → per-store app secret (falling back to global → env). Runs
 * inside the resolved org context so the credential lookups are tenant-scoped.
 *
 * This is a per-store fallback: callers should first try the env/global secret
 * (`verifyShopifyHmac`, no DB) and only call this when that fails, so that the
 * common case keeps the existing "HMAC before any DB query" DoS protection and
 * only per-store custom apps incur the extra lookup.
 */
export async function verifyShopifyWebhookHmacForShop(
  rawBody: Buffer,
  signature: string,
  shopDomain: string
): Promise<boolean> {
  const domain = String(shopDomain || "").trim();
  if (!domain) return false;
  const orgId = await resolveOrgIdByShopDomain(domain);
  if (!orgId) return false;
  return runWithOrg(orgId, async () => {
    const storeId = await getStoreIdByShopDomain(domain).catch(() => null);
    const secret = await getShopifyAppSecretForStore(storeId).catch(() => "");
    if (!secret) return false;
    return verifyShopifyHmacWithSecret(rawBody, signature, secret);
  });
}

/**
 * Report where the Shopify OAuth app credentials come from and a masked preview
 * of the API key. When `storeId` is provided and the store has its own
 * credentials, source is "store"; otherwise it falls back to global DB ("db"),
 * then env ("env"), then "none".
 */
export async function hasShopifyAppCredentials(storeId?: number | null): Promise<{
  configured: boolean;
  source: "store" | "db" | "env" | "none";
  apiKeyMasked: string;
}> {
  const fromStore =
    storeId != null ? await getShopifyAppCredentials(storeId).catch(() => null) : null;
  const fromGlobal = await getShopifyAppCredentials().catch(() => null);

  const envApiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const envApiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();

  let source: "store" | "db" | "env" | "none";
  let apiKey: string;
  if (fromStore) {
    source = "store";
    apiKey = fromStore.apiKey;
  } else if (fromGlobal) {
    source = "db";
    apiKey = fromGlobal.apiKey;
  } else if (envApiKey && envApiSecret) {
    source = "env";
    apiKey = envApiKey;
  } else {
    source = "none";
    apiKey = "";
  }

  const apiKeyMasked = apiKey ? `${apiKey.slice(0, 6)}…` : "";

  return {
    configured: source !== "none",
    source,
    apiKeyMasked,
  };
}
