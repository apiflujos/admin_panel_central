import { ensureInventoryRulesColumns, ensureInvoiceSettingsColumns, getOrgId, getPool } from "../db";

export type TransferStrategy = "manual" | "consolidation" | "priority" | "max_stock";
export type TransferTieBreak = "" | "priority" | "max_stock" | "random";
export type TransferDestinationMode = "fixed" | "auto" | "rule";
export type ContactMatchRule = "document" | "phone" | "email";
export type ShopifyOrderMode = "invoice" | "contact_only" | "db_only" | "off";
export type AlegraOrderMode = "draft" | "active" | "off";

export type StoreConfig = {
  shopDomain: string;
  transferEnabled: boolean;
  transferDestinationMode: TransferDestinationMode;
  transferDestinationRequired: boolean;
  transferDestinationWarehouseId?: string;
  transferOriginWarehouseIds: string[];
  transferPriorityWarehouseId?: string;
  transferStrategy: TransferStrategy;
  transferFallbackStrategy?: TransferStrategy | "";
  transferTieBreakRule?: TransferTieBreak;
  transferSplitEnabled?: boolean;
  transferMinStock?: number;
  priceListGeneralId?: string;
  priceListDiscountId?: string;
  priceListWholesaleId?: string;
  currency?: string;
  syncContactsFromShopify: boolean;
  syncContactsFromAlegra: boolean;
  syncContactsCreateInAlegra: boolean;
  syncContactsCreateInShopify: boolean;
  contactMatchPriority: ContactMatchRule[];
  syncOrdersShopifyToAlegra: ShopifyOrderMode;
  syncOrdersAlegraToShopify: AlegraOrderMode;
};

const normalizeTransferStrategy = (value: unknown): TransferStrategy => {
  if (value === "consolidation" || value === "priority" || value === "max_stock") {
    return value;
  }
  return "manual";
};

const normalizeFallbackStrategy = (value: unknown): TransferStrategy | "" => {
  if (value === "" || value === null || value === undefined) return "";
  return normalizeTransferStrategy(value);
};

const normalizeTieBreakRule = (value: unknown): TransferTieBreak => {
  if (value === "priority" || value === "max_stock" || value === "random") {
    return value;
  }
  return "";
};

const normalizeDestinationMode = (value: unknown): TransferDestinationMode => {
  if (value === "auto" || value === "rule") return value;
  return "fixed";
};

const normalizeMinStock = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 0;
};

const normalizeMatchPriority = (value: unknown): ContactMatchRule[] => {
  const fallback: ContactMatchRule[] = ["document", "phone", "email"];
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("_")
      : fallback;
  const allowed = new Set(["document", "phone", "email"]);
  const cleaned = raw
    .map((item) => String(item).toLowerCase())
    .filter((item) => allowed.has(item)) as ContactMatchRule[];
  return cleaned.length ? cleaned : fallback;
};

const normalizeShopifyOrderMode = (value: unknown): ShopifyOrderMode => {
  if (value === "contact_only" || value === "off" || value === "invoice" || value === "db_only") {
    return value;
  }
  return "db_only";
};

const normalizeAlegraOrderMode = (value: unknown): AlegraOrderMode => {
  if (value === "draft" || value === "active" || value === "off") return value;
  return "off";
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
    config_json: unknown;
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
           currency,
           config_json
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  const config = (row.config_json as Record<string, unknown>) || {};
  const transfers = (config.transfers as Record<string, unknown>) || {};
  const priceLists = (config.priceLists as Record<string, unknown>) || {};
  const sync = (config.sync as Record<string, unknown>) || {};
  const contactSync = (sync.contacts as Record<string, unknown>) || {};
  const orderSync = (sync.orders as Record<string, unknown>) || {};
  const contactsEnabledRaw = (contactSync as Record<string, unknown>).enabled;
  const contactsEnabled =
    typeof contactsEnabledRaw === "boolean"
      ? contactsEnabledRaw
      : contactSync.fromShopify !== false || contactSync.fromAlegra !== false;
  const orderShopifyMode = normalizeShopifyOrderMode(orderSync.shopifyToAlegra);
  const orderAlegraMode = normalizeAlegraOrderMode(orderSync.alegraToShopify);
  const ordersShopifyEnabledRaw = (orderSync as Record<string, unknown>).shopifyEnabled;
  const ordersAlegraEnabledRaw = (orderSync as Record<string, unknown>).alegraEnabled;
  const ordersShopifyEnabled =
    typeof ordersShopifyEnabledRaw === "boolean"
      ? ordersShopifyEnabledRaw
      : orderShopifyMode !== "off";
  const ordersAlegraEnabled =
    typeof ordersAlegraEnabledRaw === "boolean"
      ? ordersAlegraEnabledRaw
      : orderAlegraMode !== "off";
  const effectiveOrderShopifyMode: ShopifyOrderMode =
    contactsEnabled || orderShopifyMode === "db_only" || orderShopifyMode === "off"
      ? orderShopifyMode
      : "db_only";
  return {
    shopDomain: row.shop_domain,
    transferEnabled: transfers.enabled !== false,
    transferDestinationMode: normalizeDestinationMode(transfers.destinationMode),
    transferDestinationRequired: transfers.destinationRequired !== false,
    transferDestinationWarehouseId:
      (transfers.destinationWarehouseId as string | undefined) ||
      row.transfer_destination_warehouse_id ||
      undefined,
    transferOriginWarehouseIds:
      Array.isArray(transfers.originWarehouseIds)
        ? (transfers.originWarehouseIds as string[])
        : parseIdList(row.transfer_origin_warehouse_ids),
    transferPriorityWarehouseId:
      (transfers.priorityWarehouseId as string | undefined) ||
      row.transfer_priority_warehouse_id ||
      undefined,
    transferStrategy: normalizeTransferStrategy(
      (transfers.strategy as string | undefined) || row.transfer_strategy
    ),
    transferFallbackStrategy: normalizeFallbackStrategy(transfers.fallbackStrategy),
    transferTieBreakRule: normalizeTieBreakRule(transfers.tieBreakRule),
    transferSplitEnabled: transfers.splitEnabled === true,
    transferMinStock: normalizeMinStock(transfers.minStock),
    priceListGeneralId:
      (priceLists.generalId as string | undefined) ||
      row.price_list_general_id ||
      undefined,
    priceListDiscountId:
      (priceLists.discountId as string | undefined) ||
      row.price_list_discount_id ||
      undefined,
    priceListWholesaleId:
      (priceLists.wholesaleId as string | undefined) ||
      row.price_list_wholesale_id ||
      undefined,
    currency: (priceLists.currency as string | undefined) || row.currency || undefined,
    syncContactsFromShopify: contactsEnabled && contactSync.fromShopify !== false,
    syncContactsFromAlegra: contactsEnabled && contactSync.fromAlegra !== false,
    syncContactsCreateInAlegra: contactsEnabled && contactSync.createInAlegra !== false,
    syncContactsCreateInShopify: contactsEnabled && contactSync.createInShopify !== false,
    contactMatchPriority: normalizeMatchPriority(contactSync.matchPriority),
    syncOrdersShopifyToAlegra: ordersShopifyEnabled ? effectiveOrderShopifyMode : "off",
    syncOrdersAlegraToShopify: ordersAlegraEnabled ? orderAlegraMode : "off",
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
    transferEnabled: true,
    transferDestinationMode: "fixed",
    transferDestinationRequired: true,
    transferDestinationWarehouseId: invoice.rows[0]?.warehouse_id || undefined,
    transferOriginWarehouseIds: parseIdList(rules.rows[0]?.warehouse_ids || null),
    transferStrategy: "manual",
    syncContactsFromShopify: true,
    syncContactsFromAlegra: true,
    syncContactsCreateInAlegra: true,
    syncContactsCreateInShopify: true,
    contactMatchPriority: ["document", "phone", "email"],
    syncOrdersShopifyToAlegra: "invoice",
    syncOrdersAlegraToShopify: "off",
  };
}

export async function resolveStoreConfig(shopDomain?: string | null): Promise<StoreConfig> {
  if (shopDomain) {
    const found = await getStoreConfigByDomain(shopDomain);
    if (found) return found;
  }
  return getDefaultStoreConfig();
}
