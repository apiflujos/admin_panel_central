import { getPool, runWithOrg } from "../db";

let cache: { ids: number[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function listActiveOrganizationIds(): Promise<number[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.ids;
  }
  const pool = getPool();
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM organizations ORDER BY id ASC`
  );
  const ids = result.rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
  cache = { ids, expiresAt: now + CACHE_TTL_MS };
  return ids;
}

export function invalidateOrganizationsCache() {
  cache = null;
}

/**
 * Ejecuta `fn` una vez por cada organización activa, envuelto en `runWithOrg`.
 * Los errores por org se aíslan (no cancelan las demás iteraciones).
 */
export async function withEachOrganization(fn: (orgId: number) => Promise<void>): Promise<void> {
  const orgIds = await listActiveOrganizationIds();
  for (const orgId of orgIds) {
    try {
      await runWithOrg(orgId, () => fn(orgId));
    } catch (error) {
      console.error(`[withEachOrganization] org=${orgId} error:`, error);
    }
  }
}

/**
 * Resuelve el `organization_id` para un `shop_domain` Shopify.
 * Retorna null si no existe. Usado por handlers de webhook para envolver
 * en `runWithOrg` antes de acceder a otras tablas.
 */
export async function resolveOrgIdByShopDomain(shopDomain: string): Promise<number | null> {
  if (!shopDomain) return null;
  const pool = getPool();
  const result = await pool.query<{ organization_id: number }>(
    `
    SELECT organization_id
    FROM shopify_stores
    WHERE shop_domain = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [shopDomain]
  );
  const orgId = Number(result.rows[0]?.organization_id);
  return Number.isInteger(orgId) && orgId > 0 ? orgId : null;
}

/**
 * Resuelve el `organization_id` para una cuenta Alegra.
 */
export async function resolveOrgIdByAlegraAccountId(accountId: number): Promise<number | null> {
  if (!Number.isFinite(accountId)) return null;
  const pool = getPool();
  const result = await pool.query<{ organization_id: number }>(
    `
    SELECT organization_id
    FROM alegra_accounts
    WHERE id = $1
    LIMIT 1
    `,
    [accountId]
  );
  const orgId = Number(result.rows[0]?.organization_id);
  return Number.isInteger(orgId) && orgId > 0 ? orgId : null;
}
