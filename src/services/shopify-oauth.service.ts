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
  storeName?: string | null,
  storeId?: number | null,
  alegraAccountId?: number | null,
  initiatedByUserId?: number | null
) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const normalized = normalizeShopDomain(shopDomain);
  if (initiatedByUserId) {
    await pool.query(
      `
      DELETE FROM shopify_oauth_states
      WHERE organization_id = $1
        AND shop_domain = $2
        AND initiated_by_user_id = $3
      `,
      [orgId, normalized, initiatedByUserId]
    );
  }
  await pool.query(
    `
    INSERT INTO shopify_oauth_states (
      organization_id, shop_domain, nonce,
      store_name, store_id, alegra_account_id, initiated_by_user_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
    [
      orgId,
      normalized,
      nonce,
      storeName || null,
      storeId || null,
      alegraAccountId || null,
      initiatedByUserId || null,
    ]
  );
}

export type ConsumeOAuthStateResult =
  | {
      ok: true;
      storeName: string;
      storeId: number | null;
      alegraAccountId: number | null;
      initiatedByUserId: number | null;
    }
  | { ok: false; reason: "not_found" | "user_mismatch" };

export async function consumeOAuthState(
  shopDomain: string,
  nonce: string,
  expectedUserId?: number | null
): Promise<ConsumeOAuthStateResult> {
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
  const result = await pool.query<{
    id: number;
    store_name: string | null;
    store_id: number | null;
    alegra_account_id: number | null;
    initiated_by_user_id: number | null;
  }>(
    `
    SELECT id, store_name, store_id, alegra_account_id, initiated_by_user_id, shop_domain
    FROM shopify_oauth_states
    WHERE organization_id = $1
      AND nonce = $2
      AND created_at >= NOW() - INTERVAL '${MAX_STATE_MINUTES} minutes'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    // El nonce (128 bits, un solo uso) es la protección CSRF. NO exigimos que el
    // shop_domain calce exacto: Shopify puede devolver en el callback un handle
    // distinto (dominio myshopify vs handle del admin, p.ej. becam-cosmetics vs
    // mut50d-tj), lo que antes rompía el OAuth con "State invalido". `normalized`
    // se conserva solo para referencia/log.
    [orgId, nonce]
  );
  void normalized;
  const row = result.rows[0];
  if (!row?.id) return { ok: false, reason: "not_found" };
  if (
    row.initiated_by_user_id != null &&
    expectedUserId != null &&
    Number(row.initiated_by_user_id) !== Number(expectedUserId)
  ) {
    return { ok: false, reason: "user_mismatch" };
  }
  await pool.query("DELETE FROM shopify_oauth_states WHERE id = $1", [row.id]);
  return {
    ok: true,
    storeName: row.store_name || "",
    storeId: row.store_id || null,
    alegraAccountId: row.alegra_account_id || null,
    initiatedByUserId: row.initiated_by_user_id || null,
  };
}

export function isValidShopDomain(value: string) {
  const normalized = normalizeShopDomain(value || "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized);
}

export function normalizeShopDomainForOAuth(value: string) {
  return normalizeShopDomain(value || "");
}
