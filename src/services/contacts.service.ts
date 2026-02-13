import { getOrgId, getPool } from "../db";

type ContactInput = {
  shopDomain?: string | null;
  shopifyId?: string | number | null;
  alegraId?: string | number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  doc?: string | null;
  address?: string | null;
  source?: string | null;
};

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export async function upsertContact(input: ContactInput) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(input.shopDomain || "");
  const shopifyId = input.shopifyId ? String(input.shopifyId) : null;
  const alegraId = input.alegraId ? String(input.alegraId) : null;
  const name = input.name ? String(input.name) : null;
  const email = input.email ? String(input.email) : null;
  const phone = input.phone ? String(input.phone) : null;
  const doc = input.doc ? String(input.doc) : null;
  const address = input.address ? String(input.address) : null;
  const source = input.source ? String(input.source) : null;

  if (!shopifyId && !alegraId && !email) {
    return { skipped: true, reason: "missing_identifiers" };
  }

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM contacts
    WHERE organization_id = $1
      AND shop_domain = $2
      AND (
        shopify_id = $3
        OR alegra_id = $4
        OR (email = $5 AND $5 IS NOT NULL AND $5 <> '')
      )
    LIMIT 1
    `,
    [orgId, shopDomain, shopifyId, alegraId, email]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE contacts
      SET shop_domain = COALESCE(NULLIF($2, ''), shop_domain),
          shopify_id = COALESCE($3, shopify_id),
          alegra_id = COALESCE($4, alegra_id),
          name = COALESCE($5, name),
          email = COALESCE($6, email),
          phone = COALESCE($7, phone),
          doc = COALESCE($8, doc),
          address = COALESCE($9, address),
          source = COALESCE($10, source),
          sync_status = CASE
            WHEN COALESCE($3, shopify_id) IS NOT NULL
             AND COALESCE($4, alegra_id) IS NOT NULL
            THEN 'synced'
            ELSE 'pending'
          END,
          last_sync_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [existing.rows[0].id, shopDomain, shopifyId, alegraId, name, email, phone, doc, address, source]
    );
    return { updated: true };
  }

  const syncStatus = shopifyId && alegraId ? "synced" : "pending";
  await pool.query(
    `
    INSERT INTO contacts
      (organization_id, shop_domain, shopify_id, alegra_id, name, email, phone, doc, address, source, sync_status, last_sync_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
    `,
    [orgId, shopDomain, shopifyId, alegraId, name, email, phone, doc, address, source, syncStatus]
  );
  return { created: true };
}

export async function listContacts(options: {
  shopDomain?: string;
  query?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  const where: string[] = ["organization_id = $1"];
  const params: Array<string | number | null> = [orgId];
  let idx = 2;

  const add = (clause: string, value: string | number | null) => {
    where.push(clause.replace("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (typeof options.shopDomain === "string") {
    add("shop_domain = $idx", normalizeShopDomain(options.shopDomain));
  }
  if (options.query) {
    const q = `%${options.query}%`;
    where.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR doc ILIKE $${idx} OR address ILIKE $${idx})`
    );
    params.push(q);
    idx += 1;
  }
  if (options.status) {
    add("sync_status = $idx", options.status);
  }
  if (options.source) {
    add("source = $idx", options.source);
  }
  if (options.from) {
    add("updated_at >= $idx", options.from);
  }
  if (options.to) {
    add("updated_at <= $idx", options.to);
  }

  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0 ? Number(options.limit) : 20;
  const offset = Number.isFinite(options.offset) && Number(options.offset) >= 0 ? Number(options.offset) : 0;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM contacts
    ${whereClause}
    `,
    params
  );

  const items = await pool.query(
    `
    SELECT id,
           shopify_id,
           alegra_id,
           name,
           email,
           phone,
           doc,
           address,
           source,
           sync_status,
           updated_at
    FROM contacts
    ${whereClause}
    ORDER BY updated_at DESC NULLS LAST
    LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  return {
    items: items.rows,
    total: Number(countResult.rows[0]?.total || 0),
    limit,
    offset,
  };
}
