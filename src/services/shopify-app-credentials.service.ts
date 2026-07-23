import { getOrgId, getPool } from "../db";
import { encryptString, decryptString } from "../utils/crypto";

const PROVIDER = "shopify_oauth_app";

export type ShopifyAppCredentials = {
  apiKey: string;
  apiSecret: string;
  scopes?: string;
};

/**
 * Read the Shopify OAuth app credentials (API key + secret + scopes) from the
 * `credentials` table for the current organization. Returns null when there is
 * no stored row, when decryption/parsing fails, or when apiKey/apiSecret are
 * missing.
 */
export async function getShopifyAppCredentials(): Promise<ShopifyAppCredentials | null> {
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
    [orgId, PROVIDER]
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
 * organization. Upserts: updates the latest row when present, otherwise inserts.
 */
export async function saveShopifyAppCredentials(input: ShopifyAppCredentials): Promise<void> {
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
  const dataEncrypted = encryptString(JSON.stringify({ apiKey, apiSecret, scopes }));

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, PROVIDER]
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
    [orgId, PROVIDER, dataEncrypted]
  );
}

/**
 * Resolve the effective Shopify OAuth config: database credentials first, with a
 * per-field fallback to the SHOPIFY_API_KEY / SHOPIFY_API_SECRET / SHOPIFY_SCOPES
 * environment variables. All values are trimmed.
 */
export async function resolveShopifyOAuthConfig(): Promise<{
  apiKey: string;
  apiSecret: string;
  scopes: string;
}> {
  const fromDb = await getShopifyAppCredentials().catch(() => null);

  const envApiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const envApiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();
  const envScopes = String(process.env.SHOPIFY_SCOPES || "").trim();

  const apiKey = String(fromDb?.apiKey || "").trim() || envApiKey;
  const apiSecret = String(fromDb?.apiSecret || "").trim() || envApiSecret;
  const scopes = String(fromDb?.scopes || "").trim() || envScopes;

  return { apiKey, apiSecret, scopes };
}

/**
 * Report where the Shopify OAuth app credentials come from and a masked preview
 * of the API key. Useful for the settings status endpoint.
 */
export async function hasShopifyAppCredentials(): Promise<{
  configured: boolean;
  source: "db" | "env" | "none";
  apiKeyMasked: string;
}> {
  const fromDb = await getShopifyAppCredentials().catch(() => null);

  const envApiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const envApiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();

  let source: "db" | "env" | "none";
  let apiKey: string;
  if (fromDb) {
    source = "db";
    apiKey = fromDb.apiKey;
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
