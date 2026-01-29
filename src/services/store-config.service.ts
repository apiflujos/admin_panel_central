import { ensureInventoryRulesColumns, ensureInvoiceSettingsColumns, getOrgId, getPool } from "../db";

export type StoreConfig = {
  shopDomain: string;
  transferDestinationWarehouseId?: string;
  transferOriginWarehouseIds: string[];
  transferPriorityWarehouseId?: string;
  transferStrategy: "consolidation";
  priceListGeneralId?: string;
  priceListDiscountId?: string;
  priceListWholesaleId?: string;
  currency?: string;
};

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const parseIdList = (value?: string | null) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

export async function getStoreConfigByDomain(shopDomain: string): Promise<StoreConfig | null> {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) return null;
  const result = await pool.query<{
    shop_domain: string;
    transfer_destination_warehouse_id: string | null;
    transfer_origin_warehouse_ids: string | null;
    transfer_priority_warehouse_id: string | null;
    transfer_strategy: string | null;
    price_list_general_id: string | null;
    price_list_discount_id: string | null;
    price_list_wholesale_id: string | null;
    currency: string | null;
  }>(
    `
    SELECT shop_domain,
           transfer_destination_warehouse_id,
           transfer_origin_warehouse_ids,
           transfer_priority_warehouse_id,
           transfer_strategy,
           price_list_general_id,
           price_list_discount_id,
           price_list_wholesale_id,
           currency
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    shopDomain: row.shop_domain,
    transferDestinationWarehouseId: row.transfer_destination_warehouse_id || undefined,
    transferOriginWarehouseIds: parseIdList(row.transfer_origin_warehouse_ids),
    transferPriorityWarehouseId: row.transfer_priority_warehouse_id || undefined,
    transferStrategy: row.transfer_strategy === "consolidation" ? "consolidation" : "consolidation",
    priceListGeneralId: row.price_list_general_id || undefined,
    priceListDiscountId: row.price_list_discount_id || undefined,
    priceListWholesaleId: row.price_list_wholesale_id || undefined,
    currency: row.currency || undefined,
  };
}

export async function getDefaultStoreConfig(): Promise<StoreConfig> {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureInventoryRulesColumns(pool);
  await ensureInvoiceSettingsColumns(pool);

  const rules = await pool.query<{ warehouse_ids: string | null }>(
    `
    SELECT warehouse_ids
    FROM inventory_rules
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  const invoice = await pool.query<{ warehouse_id: string | null }>(
    `
    SELECT warehouse_id
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  return {
    shopDomain: "default",
    transferDestinationWarehouseId: invoice.rows[0]?.warehouse_id || undefined,
    transferOriginWarehouseIds: parseIdList(rules.rows[0]?.warehouse_ids || null),
    transferStrategy: "consolidation",
  };
}

export async function resolveStoreConfig(shopDomain?: string | null): Promise<StoreConfig> {
  if (shopDomain) {
    const found = await getStoreConfigByDomain(shopDomain);
    if (found) return found;
  }
  return getDefaultStoreConfig();
}
