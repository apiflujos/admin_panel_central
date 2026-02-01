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
