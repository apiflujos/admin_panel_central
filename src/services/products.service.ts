import { getOrgId, getPool } from "../db";

type ProductInput = {
  alegraId?: string | number | null;
  shopifyId?: string | number | null;
  name?: string | null;
  reference?: string | null;
  sku?: string | null;
  statusAlegra?: string | null;
  statusShopify?: string | null;
  inventoryQuantity?: number | null;
  warehouseIds?: string[] | null;
  source?: string | null;
  sourceUpdatedAt?: string | number | Date | null;
};

const parseTimestamp = (value: ProductInput["sourceUpdatedAt"]) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

export async function upsertProduct(input: ProductInput) {
  const pool = getPool();
  const orgId = getOrgId();
  const alegraId = input.alegraId ? String(input.alegraId) : null;
  const shopifyId = input.shopifyId ? String(input.shopifyId) : null;
  const name = input.name ? String(input.name) : null;
  const reference = input.reference ? String(input.reference) : null;
  const sku = input.sku ? String(input.sku) : null;
  const statusAlegra = input.statusAlegra ? String(input.statusAlegra) : null;
  const statusShopify = input.statusShopify ? String(input.statusShopify) : null;
  const inventoryQuantity =
    typeof input.inventoryQuantity === "number" && Number.isFinite(input.inventoryQuantity)
      ? input.inventoryQuantity
      : null;
  const warehouseIds = Array.isArray(input.warehouseIds)
    ? input.warehouseIds.map((id) => String(id)).filter(Boolean)
    : null;
  const source = input.source ? String(input.source) : null;
  const sourceUpdatedAt = parseTimestamp(input.sourceUpdatedAt);

  if (!alegraId && !shopifyId && !reference && !sku) {
    return { skipped: true, reason: "missing_identifiers" };
  }

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM products
    WHERE organization_id = $1
      AND (
        (alegra_item_id = $2 AND $2 IS NOT NULL)
        OR (shopify_product_id = $3 AND $3 IS NOT NULL)
        OR (reference = $4 AND $4 IS NOT NULL AND $4 <> '')
        OR (sku = $5 AND $5 IS NOT NULL AND $5 <> '')
      )
    ORDER BY
      CASE
        WHEN alegra_item_id = $2 AND $2 IS NOT NULL THEN 1
        WHEN shopify_product_id = $3 AND $3 IS NOT NULL THEN 2
        WHEN reference = $4 AND $4 IS NOT NULL AND $4 <> '' THEN 3
        WHEN sku = $5 AND $5 IS NOT NULL AND $5 <> '' THEN 4
        ELSE 5
      END
    LIMIT 1
    `,
    [orgId, alegraId, shopifyId, reference, sku]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE products
      SET alegra_item_id = COALESCE($2, alegra_item_id),
          shopify_product_id = COALESCE($3, shopify_product_id),
          name = COALESCE($4, name),
          reference = COALESCE($5, reference),
          sku = COALESCE($6, sku),
          status_alegra = COALESCE($7, status_alegra),
          status_shopify = COALESCE($8, status_shopify),
          inventory_quantity = COALESCE($9::numeric, inventory_quantity),
          warehouse_ids = COALESCE($10::text[], warehouse_ids),
          source_updated_at = COALESCE($11::timestamptz, source_updated_at),
          source = COALESCE($12::text, source),
          sync_status = CASE
            WHEN COALESCE($2, alegra_item_id) IS NOT NULL
             AND COALESCE($3, shopify_product_id) IS NOT NULL
            THEN 'synced'
            ELSE 'pending'
          END,
          last_sync_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        existing.rows[0].id,
        alegraId,
        shopifyId,
        name,
        reference,
        sku,
        statusAlegra,
        statusShopify,
        inventoryQuantity,
        warehouseIds,
        sourceUpdatedAt,
        source,
      ]
    );
    return { updated: true };
  }

  const syncStatus = alegraId && shopifyId ? "synced" : "pending";
  const insertValues = [
    orgId,
    source || "alegra",
    alegraId,
    shopifyId,
    name,
    reference,
    sku,
    statusAlegra,
    statusShopify,
    inventoryQuantity,
    warehouseIds,
    sourceUpdatedAt,
    syncStatus,
  ];

  if (alegraId) {
    await pool.query(
      `
      INSERT INTO products
        (organization_id, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, last_sync_at)
      VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::numeric,$11::text[],$12::timestamptz,$13::text,NOW())
      ON CONFLICT (organization_id, alegra_item_id) DO UPDATE SET
        shopify_product_id = COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id),
        name = COALESCE(EXCLUDED.name, products.name),
        reference = COALESCE(EXCLUDED.reference, products.reference),
        sku = COALESCE(EXCLUDED.sku, products.sku),
        status_alegra = COALESCE(EXCLUDED.status_alegra, products.status_alegra),
        status_shopify = COALESCE(EXCLUDED.status_shopify, products.status_shopify),
        inventory_quantity = COALESCE(EXCLUDED.inventory_quantity, products.inventory_quantity),
        warehouse_ids = COALESCE(EXCLUDED.warehouse_ids, products.warehouse_ids),
        source_updated_at = COALESCE(EXCLUDED.source_updated_at, products.source_updated_at),
        source = COALESCE(EXCLUDED.source, products.source),
        sync_status = CASE
          WHEN COALESCE(EXCLUDED.alegra_item_id, products.alegra_item_id) IS NOT NULL
           AND COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id) IS NOT NULL
          THEN 'synced'
          ELSE 'pending'
        END,
        last_sync_at = NOW(),
        updated_at = NOW()
      `,
      insertValues
    );
    return { upserted: true };
  }

  if (shopifyId) {
    await pool.query(
      `
      INSERT INTO products
        (organization_id, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, last_sync_at)
      VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::numeric,$11::text[],$12::timestamptz,$13::text,NOW())
      ON CONFLICT (organization_id, shopify_product_id) DO UPDATE SET
        alegra_item_id = COALESCE(EXCLUDED.alegra_item_id, products.alegra_item_id),
        name = COALESCE(EXCLUDED.name, products.name),
        reference = COALESCE(EXCLUDED.reference, products.reference),
        sku = COALESCE(EXCLUDED.sku, products.sku),
        status_alegra = COALESCE(EXCLUDED.status_alegra, products.status_alegra),
        status_shopify = COALESCE(EXCLUDED.status_shopify, products.status_shopify),
        inventory_quantity = COALESCE(EXCLUDED.inventory_quantity, products.inventory_quantity),
        warehouse_ids = COALESCE(EXCLUDED.warehouse_ids, products.warehouse_ids),
        source_updated_at = COALESCE(EXCLUDED.source_updated_at, products.source_updated_at),
        source = COALESCE(EXCLUDED.source, products.source),
        sync_status = CASE
          WHEN COALESCE(EXCLUDED.alegra_item_id, products.alegra_item_id) IS NOT NULL
           AND COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id) IS NOT NULL
          THEN 'synced'
          ELSE 'pending'
        END,
        last_sync_at = NOW(),
        updated_at = NOW()
      `,
      insertValues
    );
    return { upserted: true };
  }

  await pool.query(
    `
    INSERT INTO products
      (organization_id, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, last_sync_at)
    VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::numeric,$11::text[],$12::timestamptz,$13::text,NOW())
    `,
    insertValues
  );
  return { created: true };
}

export async function listProducts(options: {
  query?: string;
  status?: string;
  source?: string;
  inStockOnly?: boolean;
  warehouseIds?: string[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  const where: string[] = ["organization_id = $1"];
  const params: Array<string | number | null | string[]> = [orgId];
  let idx = 2;

  const add = (clause: string, value: string | number | null | string[]) => {
    where.push(clause.replace("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (options.query) {
    const q = `%${options.query}%`;
    where.push(
      `(name ILIKE $${idx} OR reference ILIKE $${idx} OR sku ILIKE $${idx})`
    );
    params.push(q);
    idx += 1;
  }
  if (options.status) {
    add("status_alegra = $idx", options.status);
  }
  if (options.source) {
    add("source = $idx", options.source);
  }
  if (options.inStockOnly) {
    where.push("(inventory_quantity IS NULL OR inventory_quantity > 0)");
  }
  if (options.warehouseIds && options.warehouseIds.length) {
    add("warehouse_ids && $idx::text[]", options.warehouseIds.map((id) => String(id)));
  }
  if (options.from) {
    add("COALESCE(source_updated_at, updated_at) >= $idx", options.from);
  }
  if (options.to) {
    add("COALESCE(source_updated_at, updated_at) <= $idx", options.to);
  }

  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0 ? Number(options.limit) : 30;
  const offset = Number.isFinite(options.offset) && Number(options.offset) >= 0 ? Number(options.offset) : 0;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM products
    ${whereClause}
    `,
    params
  );

  const items = await pool.query(
    `
    SELECT id,
           alegra_item_id,
           shopify_product_id,
           name,
           reference,
           sku,
           status_alegra,
           status_shopify,
           inventory_quantity,
           warehouse_ids,
           source,
           source_updated_at,
           updated_at
    FROM products
    ${whereClause}
    ORDER BY COALESCE(source_updated_at, updated_at) DESC NULLS LAST
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
