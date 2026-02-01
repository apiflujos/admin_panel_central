import { getOrgId, getPool } from "../db";

type ContactInput = {
  shopifyId?: string | number | null;
  alegraId?: string | number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  doc?: string | null;
  address?: string | null;
  source?: string | null;
};

export async function upsertContact(input: ContactInput) {
  const pool = getPool();
  const orgId = getOrgId();
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
      AND (
        shopify_id = $2
        OR alegra_id = $3
        OR (email = $4 AND $4 IS NOT NULL AND $4 <> '')
      )
    LIMIT 1
    `,
    [orgId, shopifyId, alegraId, email]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE contacts
      SET shopify_id = COALESCE($2, shopify_id),
          alegra_id = COALESCE($3, alegra_id),
          name = COALESCE($4, name),
          email = COALESCE($5, email),
          phone = COALESCE($6, phone),
          doc = COALESCE($7, doc),
          address = COALESCE($8, address),
          source = COALESCE($9, source),
          sync_status = CASE
            WHEN COALESCE($2, shopify_id) IS NOT NULL
             AND COALESCE($3, alegra_id) IS NOT NULL
            THEN 'synced'
            ELSE 'pending'
          END,
          last_sync_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [existing.rows[0].id, shopifyId, alegraId, name, email, phone, doc, address, source]
    );
    return { updated: true };
  }

  const syncStatus = shopifyId && alegraId ? "synced" : "pending";
  await pool.query(
    `
    INSERT INTO contacts
      (organization_id, shopify_id, alegra_id, name, email, phone, doc, address, source, sync_status, last_sync_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    `,
    [orgId, shopifyId, alegraId, name, email, phone, doc, address, source, syncStatus]
  );
  return { created: true };
}

export async function listContacts(options: {
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
