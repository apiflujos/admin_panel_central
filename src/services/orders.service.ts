import { getOrgId, getPool } from "../db";

type OrderInput = {
  shopDomain?: string | null;
  shopifyId?: string | number | null;
  alegraId?: string | number | null;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  productsSummary?: string | null;
  processedAt?: string | number | Date | null;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  alegraStatus?: string | null;
  invoiceNumber?: string | null;
  source?: string | null;
  sourceUpdatedAt?: string | number | Date | null;
};

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const parseTimestamp = (value: OrderInput["processedAt"] | OrderInput["sourceUpdatedAt"]) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

export async function upsertOrder(input: OrderInput) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(input.shopDomain || "");
  const shopifyId = input.shopifyId ? String(input.shopifyId) : null;
  const alegraId = input.alegraId ? String(input.alegraId) : null;
  const orderNumber = input.orderNumber ? String(input.orderNumber) : null;
  const customerName = input.customerName ? String(input.customerName) : null;
  const customerEmail = input.customerEmail ? String(input.customerEmail) : null;
  const productsSummary = input.productsSummary ? String(input.productsSummary) : null;
  const processedAt = parseTimestamp(input.processedAt);
  const status = input.status ? String(input.status) : null;
  const total = typeof input.total === "number" && Number.isFinite(input.total) ? input.total : null;
  const currency = input.currency ? String(input.currency) : null;
  const alegraStatus = input.alegraStatus ? String(input.alegraStatus) : null;
  const invoiceNumber = input.invoiceNumber ? String(input.invoiceNumber) : null;
  const source = input.source ? String(input.source) : null;
  const sourceUpdatedAt = parseTimestamp(input.sourceUpdatedAt);

  if (!shopifyId && !alegraId) {
    return { skipped: true, reason: "missing_identifiers" };
  }

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM orders
    WHERE organization_id = $1
      AND shop_domain = $2
      AND (
        shopify_order_id = $3
        OR alegra_invoice_id = $4
      )
    LIMIT 1
    `,
    [orgId, shopDomain, shopifyId, alegraId]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE orders
      SET shop_domain = COALESCE(NULLIF($2, ''), shop_domain),
          shopify_order_id = COALESCE($3, shopify_order_id),
          alegra_invoice_id = COALESCE($4, alegra_invoice_id),
          shopify_order_number = COALESCE($5, shopify_order_number),
          customer_name = COALESCE($6, customer_name),
          customer_email = COALESCE($7, customer_email),
          products_summary = COALESCE($8, products_summary),
          processed_at = COALESCE($9, processed_at),
          status = COALESCE($10, status),
          total = COALESCE($11, total),
          currency = COALESCE($12, currency),
          alegra_status = COALESCE($13, alegra_status),
          invoice_number = COALESCE($14, invoice_number),
          source_updated_at = COALESCE($15, source_updated_at),
          source = COALESCE($16, source),
          sync_status = CASE
            WHEN COALESCE($3, shopify_order_id) IS NOT NULL
             AND COALESCE($4, alegra_invoice_id) IS NOT NULL
            THEN 'synced'
            ELSE 'pending'
          END,
          last_sync_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        shopDomain,
        shopifyId,
        alegraId,
        orderNumber,
        customerName,
        customerEmail,
        productsSummary,
        processedAt,
        status,
        total,
        currency,
        alegraStatus,
        invoiceNumber,
        sourceUpdatedAt,
        source,
      ]
    );
    return { updated: true };
  }

  const syncStatus = shopifyId && alegraId ? "synced" : "pending";
  await pool.query(
    `
    INSERT INTO orders
      (organization_id, shop_domain, shopify_order_id, alegra_invoice_id, shopify_order_number, customer_name, customer_email, products_summary, processed_at, status, total, currency, alegra_status, invoice_number, source_updated_at, source, sync_status, last_sync_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    `,
    [
      orgId,
      shopDomain,
      shopifyId,
      alegraId,
      orderNumber,
      customerName,
      customerEmail,
      productsSummary,
      processedAt,
      status,
      total,
      currency,
      alegraStatus,
      invoiceNumber,
      sourceUpdatedAt,
      source,
      syncStatus,
    ]
  );
  return { created: true };
}

export async function listOrders(options: {
  shopDomain?: string;
  query?: string;
  source?: string;
  status?: string;
  date?: string;
  days?: number;
  from?: string;
  to?: string;
  sort?: string;
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
      `(shopify_order_number ILIKE $${idx} OR customer_name ILIKE $${idx} OR customer_email ILIKE $${idx} OR products_summary ILIKE $${idx})`
    );
    params.push(q);
    idx += 1;
  }
  if (options.source) {
    add("source = $idx", options.source);
  }
  if (options.status) {
    add("status = $idx", options.status);
  }
  if (options.date) {
    add("COALESCE(processed_at, updated_at)::date = $idx::date", options.date);
  }
  if (options.days && options.days > 0) {
    const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
    add("COALESCE(processed_at, updated_at) >= $idx", cutoff);
  }
  if (options.from) {
    add("COALESCE(processed_at, updated_at) >= $idx", options.from);
  }
  if (options.to) {
    add("COALESCE(processed_at, updated_at) <= $idx", options.to);
  }

  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0 ? Number(options.limit) : 20;
  const offset = Number.isFinite(options.offset) && Number(options.offset) >= 0 ? Number(options.offset) : 0;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM orders
    ${whereClause}
    `,
    params
  );

  const sort = String(options.sort || "date_desc");
  let orderBy = "COALESCE(processed_at, updated_at) DESC NULLS LAST";
  if (sort === "date_asc") orderBy = "COALESCE(processed_at, updated_at) ASC NULLS LAST";
  if (sort === "order_asc") orderBy = "shopify_order_number ASC NULLS LAST";
  if (sort === "order_desc") orderBy = "shopify_order_number DESC NULLS LAST";

  const items = await pool.query(
    `
    SELECT shopify_order_id,
           alegra_invoice_id,
           shopify_order_number,
           customer_name,
           customer_email,
           products_summary,
           processed_at,
           status,
           total,
           currency,
           alegra_status,
           invoice_number,
           source,
           updated_at
    FROM orders
    ${whereClause}
    ORDER BY ${orderBy}
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
