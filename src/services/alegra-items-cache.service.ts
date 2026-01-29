import { getOrgId, getPool } from "../db";

type CacheInventoryWarehouse = { id?: string | number; availableQuantity?: number | string };

type CacheInventory = {
  quantity?: number | string;
  availableQuantity?: number | string;
  warehouses?: CacheInventoryWarehouse[];
};

type CacheVariant = {
  inventory?: CacheInventory;
};

export type CachedAlegraItem = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  reference?: string;
  barcode?: string;
  status?: string;
  inventory?: CacheInventory;
  itemVariants?: CacheVariant[];
};

type CacheListParams = {
  orgId?: number;
  query?: string;
  start?: number;
  limit?: number;
  inStockOnly?: boolean;
  warehouseIds?: string[];
};

const parseQuantity = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveInventoryQuantity = (inventory: CacheInventory | undefined) => {
  if (!inventory) return null;
  const warehouses: CacheInventoryWarehouse[] = Array.isArray(inventory.warehouses)
    ? inventory.warehouses
    : [];
  if (warehouses.length) {
    const totals = warehouses.reduce(
      (acc, warehouse: CacheInventoryWarehouse) => {
        const qty = parseQuantity(warehouse?.availableQuantity);
        if (qty !== null) {
          acc.sum += qty;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );
    return totals.count ? totals.sum : null;
  }
  const qty =
    parseQuantity(inventory.availableQuantity) ?? parseQuantity(inventory.quantity);
  return qty === null ? null : qty;
};

const resolveItemQuantity = (item: CachedAlegraItem) => {
  const base = resolveInventoryQuantity(item.inventory);
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  if (!variants.length) return base;
  const totals = variants.reduce(
    (acc, variant) => {
      const qty = resolveInventoryQuantity(variant.inventory);
      if (qty !== null) {
        acc.sum += qty;
        acc.count += 1;
      }
      return acc;
    },
    { sum: 0, count: 0 }
  );
  if (!totals.count) return base;
  if (typeof base === "number") return Math.max(base, totals.sum);
  return totals.sum;
};

const collectWarehouseIds = (item: CachedAlegraItem) => {
  const ids = new Set<string>();
  const addFrom = (inventory?: CacheInventory) => {
    const warehouses = Array.isArray(inventory?.warehouses) ? inventory?.warehouses : [];
    warehouses.forEach((warehouse) => {
      const id = warehouse?.id;
      if (id !== undefined && id !== null && String(id).trim() !== "") {
        ids.add(String(id));
      }
    });
  };
  addFrom(item.inventory);
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  variants.forEach((variant) => addFrom(variant.inventory));
  return Array.from(ids);
};

const hasInventoryData = (item: CachedAlegraItem) => {
  const inv = item.inventory;
  const warehouses = Array.isArray(inv?.warehouses) ? inv?.warehouses : [];
  if (warehouses.length) return true;
  if (inv?.availableQuantity !== undefined || inv?.quantity !== undefined) return true;
  const variants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  return variants.some((variant) => {
    const vinv = variant.inventory;
    const vwarehouses = Array.isArray(vinv?.warehouses) ? vinv?.warehouses : [];
    if (vwarehouses.length) return true;
    return vinv?.availableQuantity !== undefined || vinv?.quantity !== undefined;
  });
};

export async function ensureAlegraItemsCacheTable() {
  const pool = getPool();
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS alegra_items_cache (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      alegra_item_id TEXT NOT NULL,
      name TEXT,
      reference TEXT,
      barcode TEXT,
      status TEXT,
      inventory_quantity NUMERIC,
      warehouse_ids TEXT[],
      item_json JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (organization_id, alegra_item_id)
    )
    `
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS alegra_items_cache_org_idx ON alegra_items_cache (organization_id)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS alegra_items_cache_org_updated_idx ON alegra_items_cache (organization_id, updated_at DESC)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS alegra_items_cache_ref_idx ON alegra_items_cache (organization_id, reference)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS alegra_items_cache_name_idx ON alegra_items_cache (organization_id, name)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS alegra_items_cache_warehouse_idx ON alegra_items_cache USING GIN (warehouse_ids)"
  );
}

export async function upsertAlegraItemCache(item: CachedAlegraItem, orgId?: number) {
  if (!item?.id) return;
  const resolvedOrgId = orgId ?? getOrgId();
  await ensureAlegraItemsCacheTable();
  const itemId = String(item.id);
  const inventoryQty = resolveItemQuantity(item);
  const warehouseIds = collectWarehouseIds(item);
  const inventoryPresent = hasInventoryData(item);
  const pool = getPool();
  const payloadJson = item as unknown as Record<string, unknown>;
  await pool.query(
    `
    INSERT INTO alegra_items_cache (
      organization_id,
      alegra_item_id,
      name,
      reference,
      barcode,
      status,
      inventory_quantity,
      warehouse_ids,
      item_json,
      updated_at,
      last_seen_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
    ON CONFLICT (organization_id, alegra_item_id)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, alegra_items_cache.name),
      reference = COALESCE(EXCLUDED.reference, alegra_items_cache.reference),
      barcode = COALESCE(EXCLUDED.barcode, alegra_items_cache.barcode),
      status = COALESCE(EXCLUDED.status, alegra_items_cache.status),
      inventory_quantity = CASE
        WHEN $10 THEN COALESCE(EXCLUDED.inventory_quantity, alegra_items_cache.inventory_quantity)
        ELSE alegra_items_cache.inventory_quantity
      END,
      warehouse_ids = CASE
        WHEN $10 THEN COALESCE(EXCLUDED.warehouse_ids, alegra_items_cache.warehouse_ids)
        ELSE alegra_items_cache.warehouse_ids
      END,
      item_json = COALESCE(alegra_items_cache.item_json, '{}'::jsonb) || EXCLUDED.item_json,
      updated_at = NOW(),
      last_seen_at = NOW()
    `,
    [
      resolvedOrgId,
      itemId,
      item.name || null,
      item.reference || null,
      item.barcode || null,
      item.status || null,
      inventoryQty,
      warehouseIds.length ? warehouseIds : null,
      JSON.stringify(payloadJson),
      inventoryPresent,
    ]
  );
}

export async function upsertAlegraItemsCache(items: CachedAlegraItem[], orgId?: number) {
  for (const item of items) {
    await upsertAlegraItemCache(item, orgId);
  }
}

export async function isAlegraItemTracked(alegraItemId: string, orgId?: number) {
  const resolvedOrgId = orgId ?? getOrgId();
  await ensureAlegraItemsCacheTable();
  const pool = getPool();
  const result = await pool.query(
    "SELECT 1 FROM alegra_items_cache WHERE organization_id = $1 AND alegra_item_id = $2",
    [resolvedOrgId, alegraItemId]
  );
  return result.rows.length > 0;
}

export async function upsertAlegraItemCacheIfTracked(item: CachedAlegraItem, orgId?: number) {
  if (!item?.id) return;
  const itemId = String(item.id);
  const tracked = await isAlegraItemTracked(itemId, orgId);
  if (!tracked) return;
  await upsertAlegraItemCache(item, orgId);
}

export async function countAlegraItemsCache(orgId?: number) {
  const resolvedOrgId = orgId ?? getOrgId();
  await ensureAlegraItemsCacheTable();
  const pool = getPool();
  const result = await pool.query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM alegra_items_cache WHERE organization_id = $1",
    [resolvedOrgId]
  );
  return result.rows[0]?.total ?? 0;
}

export async function listAlegraItemsCache(params: CacheListParams) {
  const resolvedOrgId = params.orgId ?? getOrgId();
  await ensureAlegraItemsCacheTable();
  const pool = getPool();
  const start = Number(params.start || 0);
  const limit = Math.max(1, Math.min(Number(params.limit || 30), 100));
  const query = String(params.query || "").trim();
  const clauses = ["organization_id = $1"];
  const values: Array<string | number> = [resolvedOrgId];
  if (query) {
    values.push(`%${query}%`);
    const idx = values.length;
    clauses.push(
      `(name ILIKE $${idx} OR reference ILIKE $${idx} OR barcode ILIKE $${idx} OR alegra_item_id = $${idx})`
    );
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const totalResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM alegra_items_cache ${whereSql}`,
    values
  );
  const total = totalResult.rows[0]?.total ?? 0;
  const listValues = values.concat([limit, start]);
  const rows = await pool.query<{
    item_json: CachedAlegraItem;
    warehouse_ids: string[] | null;
    inventory_quantity: number | null;
  }>(
    `
    SELECT item_json, warehouse_ids, inventory_quantity
    FROM alegra_items_cache
    ${whereSql}
    ORDER BY updated_at DESC, alegra_item_id DESC
    LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
    `,
    listValues
  );
  const items = rows.rows.map((row) => row.item_json);
  return { total, items };
}
