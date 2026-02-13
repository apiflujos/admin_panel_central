import { ensureOrganization, getOrgId, getPool } from "../db";

const MAX_STATE_MINUTES = 10;

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export async function createOAuthState(
  shopDomain: string,
  nonce: string,
  storeName?: string | null
) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const normalized = normalizeShopDomain(shopDomain);
  await pool.query(
    `
    INSERT INTO shopify_oauth_states (organization_id, shop_domain, nonce, store_name, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [orgId, normalized, nonce, storeName || null]
  );
}

export async function consumeOAuthState(shopDomain: string, nonce: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = normalizeShopDomain(shopDomain);
  await pool.query(
    `
    DELETE FROM shopify_oauth_states
    WHERE organization_id = $1
      AND created_at < NOW() - INTERVAL '30 minutes'
    `,
    [orgId]
  );
  const result = await pool.query<{ id: number; store_name: string | null }>(
    `
    SELECT id, store_name
    FROM shopify_oauth_states
    WHERE organization_id = $1
      AND shop_domain = $2
      AND nonce = $3
      AND created_at >= NOW() - INTERVAL '${MAX_STATE_MINUTES} minutes'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, normalized, nonce]
  );
  const row = result.rows[0];
  if (!row?.id) return { ok: false as const };
  await pool.query("DELETE FROM shopify_oauth_states WHERE id = $1", [row.id]);
  return { ok: true as const, storeName: row.store_name || "" };
}

export function isValidShopDomain(value: string) {
  const normalized = normalizeShopDomain(value || "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized);
}

export function normalizeShopDomainForOAuth(value: string) {
  return normalizeShopDomain(value || "");
}
