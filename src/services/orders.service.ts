import { getOrgId, getPool } from "../db";

type OrderInput = {
  shopifyId?: string | number | null;
  alegraId?: string | number | null;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  source?: string | null;
};

export async function upsertOrder(input: OrderInput) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopifyId = input.shopifyId ? String(input.shopifyId) : null;
  const alegraId = input.alegraId ? String(input.alegraId) : null;
  const status = input.status ? String(input.status) : null;
  const total = typeof input.total === "number" && Number.isFinite(input.total) ? input.total : null;
  const currency = input.currency ? String(input.currency) : null;
  const source = input.source ? String(input.source) : null;

  if (!shopifyId && !alegraId) {
    return { skipped: true, reason: "missing_identifiers" };
  }

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM orders
    WHERE organization_id = $1
      AND (
        shopify_order_id = $2
        OR alegra_invoice_id = $3
      )
    LIMIT 1
    `,
    [orgId, shopifyId, alegraId]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE orders
      SET shopify_order_id = COALESCE($2, shopify_order_id),
          alegra_invoice_id = COALESCE($3, alegra_invoice_id),
          status = COALESCE($4, status),
          total = COALESCE($5, total),
          currency = COALESCE($6, currency),
          source = COALESCE($7, source),
          sync_status = CASE
            WHEN COALESCE($2, shopify_order_id) IS NOT NULL
             AND COALESCE($3, alegra_invoice_id) IS NOT NULL
            THEN 'synced'
            ELSE 'pending'
          END,
          last_sync_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [existing.rows[0].id, shopifyId, alegraId, status, total, currency, source]
    );
    return { updated: true };
  }

  const syncStatus = shopifyId && alegraId ? "synced" : "pending";
  await pool.query(
    `
    INSERT INTO orders
      (organization_id, shopify_order_id, alegra_invoice_id, status, total, currency, source, sync_status, last_sync_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    `,
    [orgId, shopifyId, alegraId, status, total, currency, source, syncStatus]
  );
  return { created: true };
}
