import { getOrgId, getPool } from "../db";

type ProductInput = {
  shopDomain?: string | null;
  storeId?: number | null;
  alegraId?: string | number | null;
  shopifyId?: string | number | null;
  name?: string | null;
  reference?: string | null;
  sku?: string | null;
  barcode?: string | null;
  statusAlegra?: string | null;
  statusShopify?: string | null;
  inventoryQuantity?: number | null;
  warehouseIds?: string[] | null;
  source?: string | null;
  sourceUpdatedAt?: string | number | Date | null;
  payloadJson?: unknown;
};

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const parseTimestamp = (value: ProductInput["sourceUpdatedAt"]) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

export async function upsertProduct(input: ProductInput, options?: { mode?: "upsert" | "insert_only" }) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(input.shopDomain || "");
  const storeId =
    typeof input.storeId === "number" && Number.isFinite(input.storeId) && input.storeId > 0 ? input.storeId : null;
  const alegraId = input.alegraId ? String(input.alegraId) : null;
  const shopifyId = input.shopifyId ? String(input.shopifyId) : null;
  const name = input.name ? String(input.name) : null;
  const reference = input.reference ? String(input.reference) : null;
  const sku = input.sku ? String(input.sku) : null;
  const barcode = input.barcode ? String(input.barcode) : null;
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
  const payloadJson =
    input.payloadJson && typeof input.payloadJson === "object" ? JSON.stringify(input.payloadJson) : JSON.stringify({});

  if (!alegraId && !shopifyId && !reference && !sku) {
    return { skipped: true, reason: "missing_identifiers" };
  }

  // Scope: when a storeId is provided, match across sources within the store
  // (so an Alegra-imported row and its Shopify counterpart collapse into one,
  // regardless of shop_domain). Otherwise fall back to the shop_domain scope,
  // preserving the historical behavior for existing callers.
  const scopeClause = storeId !== null ? "store_id = $2" : "shop_domain = $2";
  const scopeValue: number | string = storeId !== null ? storeId : shopDomain;
  const existing = await pool.query<{
    id: number;
    alegra_item_id: string | null;
    shopify_product_id: string | null;
  }>(
    `
    SELECT id, alegra_item_id, shopify_product_id
    FROM products
    WHERE organization_id = $1
      AND ${scopeClause}
      AND (
        (alegra_item_id = $3 AND $3 IS NOT NULL)
        OR (shopify_product_id = $4 AND $4 IS NOT NULL)
        OR (reference = $5 AND $5 IS NOT NULL AND $5 <> '')
        OR (sku = $6 AND $6 IS NOT NULL AND $6 <> '')
        OR (barcode = $7 AND $7 IS NOT NULL AND $7 <> '')
      )
    ORDER BY
      CASE
        WHEN alegra_item_id = $3 AND $3 IS NOT NULL THEN 1
        WHEN shopify_product_id = $4 AND $4 IS NOT NULL THEN 2
        WHEN reference = $5 AND $5 IS NOT NULL AND $5 <> '' THEN 3
        WHEN sku = $6 AND $6 IS NOT NULL AND $6 <> '' THEN 4
        WHEN barcode = $7 AND $7 IS NOT NULL AND $7 <> '' THEN 5
        ELSE 6
      END
    LIMIT 1
    `,
    [orgId, scopeValue, alegraId, shopifyId, reference, sku, barcode]
  );

  if (existing.rows.length) {
    if (options?.mode === "insert_only") {
      return { skipped: true, reason: "insert_only" };
    }
    // Safeguard: si la row existente ya tiene un alegra_item_id o shopify_product_id
    // DISTINTO del incoming, NO lo sobrescribimos (evita colapso silencioso de items
    // diferentes que comparten SKU — típico en catálogos importados de proveedor).
    const existingAlegraId = existing.rows[0].alegra_item_id;
    const existingShopifyId = existing.rows[0].shopify_product_id;
    const safeAlegraId =
      alegraId && existingAlegraId && String(existingAlegraId) !== String(alegraId)
        ? null // preserva el existente
        : alegraId;
    const safeShopifyId =
      shopifyId && existingShopifyId && String(existingShopifyId) !== String(shopifyId)
        ? null
        : shopifyId;
    if (safeAlegraId !== alegraId || safeShopifyId !== shopifyId) {
      console.warn(
        `[products.upsertProduct] cross-key collision on shop=${shopDomain} sku=${sku || "-"} ref=${reference || "-"}: ` +
          `existing(alegra=${existingAlegraId} shopify=${existingShopifyId}) vs incoming(alegra=${alegraId} shopify=${shopifyId}) — preserving existing IDs`
      );
    }
    await pool.query(
      `
      UPDATE products
      SET shop_domain = COALESCE(NULLIF($2, ''), shop_domain),
          store_id = COALESCE($16, store_id),
          alegra_item_id = COALESCE($3, alegra_item_id),
          shopify_product_id = COALESCE($4, shopify_product_id),
          name = COALESCE($5, name),
          reference = COALESCE($6, reference),
          sku = COALESCE($7, sku),
          barcode = COALESCE($15, barcode),
          status_alegra = COALESCE($8, status_alegra),
          status_shopify = COALESCE($9, status_shopify),
          inventory_quantity = COALESCE($10::numeric, inventory_quantity),
          warehouse_ids = COALESCE($11::text[], warehouse_ids),
          source_updated_at = COALESCE($12::timestamptz, source_updated_at),
          source = COALESCE($13::text, source),
          payload_json = COALESCE(products.payload_json, '{}'::jsonb) || $14::jsonb,
          sync_status = CASE
            WHEN COALESCE($3, alegra_item_id) IS NOT NULL
             AND COALESCE($4, shopify_product_id) IS NOT NULL
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
        safeAlegraId,
        safeShopifyId,
        name,
        reference,
        sku,
        statusAlegra,
        statusShopify,
        inventoryQuantity,
        warehouseIds,
        sourceUpdatedAt,
        source,
        payloadJson,
        barcode,
        storeId,
      ]
    );
    return { updated: true };
  }

  const syncStatus = alegraId && shopifyId ? "synced" : "pending";
  const insertValues = [
    orgId,
    shopDomain,
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
    payloadJson,
    barcode,
    storeId,
  ];

  if (alegraId) {
    if (options?.mode === "insert_only") {
      await pool.query(
        `
        INSERT INTO products
          (organization_id, shop_domain, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, payload_json, barcode, store_id, last_sync_at)
        VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::numeric,$12::text[],$13::timestamptz,$14::text,$15::jsonb,$16::text,$17::integer,NOW())
        ON CONFLICT (organization_id, shop_domain, alegra_item_id) DO NOTHING
        `,
        insertValues
      );
    } else {
      await pool.query(
        `
        INSERT INTO products
          (organization_id, shop_domain, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, payload_json, barcode, store_id, last_sync_at)
        VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::numeric,$12::text[],$13::timestamptz,$14::text,$15::jsonb,$16::text,$17::integer,NOW())
        ON CONFLICT (organization_id, shop_domain, alegra_item_id) DO UPDATE SET
          store_id = COALESCE(EXCLUDED.store_id, products.store_id),
          shopify_product_id = COALESCE(EXCLUDED.shopify_product_id, products.shopify_product_id),
          name = COALESCE(EXCLUDED.name, products.name),
          reference = COALESCE(EXCLUDED.reference, products.reference),
          sku = COALESCE(EXCLUDED.sku, products.sku),
          barcode = COALESCE(EXCLUDED.barcode, products.barcode),
          status_alegra = COALESCE(EXCLUDED.status_alegra, products.status_alegra),
          status_shopify = COALESCE(EXCLUDED.status_shopify, products.status_shopify),
          inventory_quantity = COALESCE(EXCLUDED.inventory_quantity, products.inventory_quantity),
          warehouse_ids = COALESCE(EXCLUDED.warehouse_ids, products.warehouse_ids),
          source_updated_at = COALESCE(EXCLUDED.source_updated_at, products.source_updated_at),
          source = COALESCE(EXCLUDED.source, products.source),
          payload_json = COALESCE(products.payload_json, '{}'::jsonb) || EXCLUDED.payload_json,
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
    }
    return { upserted: true };
  }

  if (shopifyId) {
    if (options?.mode === "insert_only") {
      await pool.query(
        `
        INSERT INTO products
          (organization_id, shop_domain, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, payload_json, barcode, store_id, last_sync_at)
        VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::numeric,$12::text[],$13::timestamptz,$14::text,$15::jsonb,$16::text,$17::integer,NOW())
        ON CONFLICT (organization_id, shop_domain, shopify_product_id) DO NOTHING
        `,
        insertValues
      );
    } else {
      await pool.query(
        `
        INSERT INTO products
          (organization_id, shop_domain, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, payload_json, barcode, store_id, last_sync_at)
        VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::numeric,$12::text[],$13::timestamptz,$14::text,$15::jsonb,$16::text,$17::integer,NOW())
        ON CONFLICT (organization_id, shop_domain, shopify_product_id) DO UPDATE SET
          store_id = COALESCE(EXCLUDED.store_id, products.store_id),
          alegra_item_id = COALESCE(EXCLUDED.alegra_item_id, products.alegra_item_id),
          name = COALESCE(EXCLUDED.name, products.name),
          reference = COALESCE(EXCLUDED.reference, products.reference),
          sku = COALESCE(EXCLUDED.sku, products.sku),
          barcode = COALESCE(EXCLUDED.barcode, products.barcode),
          status_alegra = COALESCE(EXCLUDED.status_alegra, products.status_alegra),
          status_shopify = COALESCE(EXCLUDED.status_shopify, products.status_shopify),
          inventory_quantity = COALESCE(EXCLUDED.inventory_quantity, products.inventory_quantity),
          warehouse_ids = COALESCE(EXCLUDED.warehouse_ids, products.warehouse_ids),
          source_updated_at = COALESCE(EXCLUDED.source_updated_at, products.source_updated_at),
          source = COALESCE(EXCLUDED.source, products.source),
          payload_json = COALESCE(products.payload_json, '{}'::jsonb) || EXCLUDED.payload_json,
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
    }
    return { upserted: true };
  }

  await pool.query(
    `
    INSERT INTO products
      (organization_id, shop_domain, source, alegra_item_id, shopify_product_id, name, reference, sku, status_alegra, status_shopify, inventory_quantity, warehouse_ids, source_updated_at, sync_status, payload_json, barcode, store_id, last_sync_at)
    VALUES ($1,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::numeric,$12::text[],$13::timestamptz,$14::text,$15::jsonb,$16::text,$17::integer,NOW())
    `,
    insertValues
  );
  return { created: true };
}

export async function listProducts(options: {
  shopDomain?: string;
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
  const where: string[] = ["products.organization_id = $1"];
  const params: Array<string | number | null | string[]> = [orgId];
  let idx = 2;

  const add = (clause: string, value: string | number | null | string[]) => {
    where.push(clause.replace("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (typeof options.shopDomain === "string") {
    add("products.shop_domain = $idx", normalizeShopDomain(options.shopDomain));
  }
  if (options.query) {
    const q = `%${options.query}%`;
    where.push(
      `(products.name ILIKE $${idx} OR products.reference ILIKE $${idx} OR products.sku ILIKE $${idx})`
    );
    params.push(q);
    idx += 1;
  }
  if (options.status) {
    add("products.status_alegra = $idx", options.status);
  }
  if (options.source) {
    add("products.source = $idx", options.source);
  }
  if (options.inStockOnly) {
    where.push("(products.inventory_quantity IS NULL OR products.inventory_quantity > 0)");
  }
  if (options.warehouseIds && options.warehouseIds.length) {
    add(
      "products.warehouse_ids && $idx::text[]",
      options.warehouseIds.map((id) => String(id))
    );
  }
  if (options.from) {
    add("COALESCE(products.source_updated_at, products.updated_at) >= $idx", options.from);
  }
  if (options.to) {
    add("COALESCE(products.source_updated_at, products.updated_at) <= $idx", options.to);
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
    SELECT products.id,
           products.alegra_item_id,
           products.shopify_product_id,
           products.name,
           products.reference,
           products.sku,
           products.barcode,
           products.status_alegra,
           products.status_shopify,
           products.inventory_quantity,
           products.warehouse_ids,
           CASE
             WHEN products.payload_json = '{}'::jsonb THEN COALESCE(alegra_items_cache.item_json, products.payload_json)
             ELSE products.payload_json
           END AS payload_json,
           products.source,
           products.source_updated_at,
           products.updated_at
    FROM products
    LEFT JOIN alegra_items_cache
      ON alegra_items_cache.organization_id = products.organization_id
     AND alegra_items_cache.alegra_item_id = products.alegra_item_id
    ${whereClause}
    ORDER BY COALESCE(products.source_updated_at, products.updated_at) DESC NULLS LAST
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
