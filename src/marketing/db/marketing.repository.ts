import crypto from "crypto";
import { getOrgId, getPool } from "../../db";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export function getMarketingOrgId() {
  return getOrgId();
}

export async function ensureMarketingShop(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  if (!domain) throw new Error("shopDomain requerido");

  await pool.query(
    `
    INSERT INTO marketing.shops (organization_id, shop_domain)
    VALUES ($1, $2)
    ON CONFLICT (organization_id, shop_domain) DO UPDATE
      SET updated_at = NOW()
    `,
    [orgId, domain]
  );
  return { organizationId: orgId, shopDomain: domain };
}

export async function getSyncCursor(shopDomain: string, entity: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  const key = String(entity || "").trim();
  if (!domain || !key) return "";
  const res = await pool.query<{ cursor: string }>(
    `
    SELECT cursor
    FROM marketing.sync_state
    WHERE organization_id = $1 AND shop_domain = $2 AND entity = $3
    LIMIT 1
    `,
    [orgId, domain, key]
  );
  return res.rows[0]?.cursor || "";
}

export async function setSyncCursor(shopDomain: string, entity: string, cursor: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  const key = String(entity || "").trim();
  const value = String(cursor || "");
  if (!domain || !key) return;
  await pool.query(
    `
    INSERT INTO marketing.sync_state (organization_id, shop_domain, entity, cursor, updated_at)
    VALUES ($1,$2,$3,$4,NOW())
    ON CONFLICT (organization_id, shop_domain, entity)
    DO UPDATE SET cursor = EXCLUDED.cursor, updated_at = NOW()
    `,
    [orgId, domain, key, value]
  );
}

export async function getOrCreatePixelKey(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  if (!domain) throw new Error("shopDomain requerido");
  await ensureMarketingShop(domain);

  const current = await pool.query<{ pixel_key: string | null }>(
    `
    SELECT pixel_key
    FROM marketing.shops
    WHERE organization_id = $1 AND shop_domain = $2
    LIMIT 1
    `,
    [orgId, domain]
  );
  const existing = String(current.rows[0]?.pixel_key || "").trim();
  if (existing) {
    return { shopDomain: domain, pixelKey: existing };
  }

  const generated = crypto.randomBytes(24).toString("base64url");
  await pool.query(
    `
    UPDATE marketing.shops
    SET pixel_key = $3, updated_at = NOW()
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, domain, generated]
  );
  return { shopDomain: domain, pixelKey: generated };
}

export async function rotatePixelKey(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  if (!domain) throw new Error("shopDomain requerido");
  await ensureMarketingShop(domain);
  const generated = crypto.randomBytes(24).toString("base64url");
  await pool.query(
    `
    UPDATE marketing.shops
    SET pixel_key = $3, updated_at = NOW()
    WHERE organization_id = $1 AND shop_domain = $2
    `,
    [orgId, domain, generated]
  );
  return { shopDomain: domain, pixelKey: generated };
}

export async function resolveShopDomainByPixelKey(pixelKey: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const key = String(pixelKey || "").trim();
  if (!key) return "";
  const res = await pool.query<{ shop_domain: string }>(
    `
    SELECT shop_domain
    FROM marketing.shops
    WHERE organization_id = $1 AND pixel_key = $2
    LIMIT 1
    `,
    [orgId, key]
  );
  return res.rows[0]?.shop_domain || "";
}
