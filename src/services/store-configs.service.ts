import { getSettings } from "./settings.service";
import { decryptString } from "../utils/crypto";
import { getOrgId, getPool } from "../db";

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const normalizeIdList = (value?: unknown) =>
  Array.isArray(value) ? value.map((id) => String(id)).filter(Boolean) : [];

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const normalizeAutoStatus = (value: unknown, fallback: unknown) => {
  const resolvedFallback = fallback === "active" ? "active" : "draft";
  return value === "active" ? "active" : value === "draft" ? "draft" : resolvedFallback;
};

const normalizeInvoiceStatus = (
  value: unknown,
  fallback: unknown
): "draft" | "active" => {
  const resolvedFallback = fallback === "active" ? "active" : "draft";
  return value === "active" ? "active" : value === "draft" ? "draft" : resolvedFallback;
};

const normalizeObservationsFields = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const allowed = new Set([
    "order_name",
    "payment_gateways",
    "items_summary",
    "customer_email",
    "customer_phone",
    "order_total",
  ]);
  return value.map((item) => String(item)).filter((item) => allowed.has(item));
};

const normalizeTransferStrategy = (value: unknown) => {
  if (value === "consolidation" || value === "priority" || value === "max_stock") {
    return value;
  }
  return "manual";
};

const normalizeFallbackStrategy = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return "";
  return normalizeTransferStrategy(value);
};

const normalizeTieBreakRule = (value: unknown) => {
  if (value === "priority" || value === "max_stock" || value === "random") {
    return value;
  }
  return "";
};

const normalizeDestinationMode = (value: unknown) => {
  if (value === "auto" || value === "rule") return value;
  return "fixed";
};

const normalizeMinStock = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
};

const normalizeContactPriority = (value: unknown, fallback: string[]) => {
  const base = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("_")
      : fallback;
  const allowed = new Set(["document", "phone", "email"]);
  const cleaned = base
    .map((item) => String(item).toLowerCase())
    .filter((item) => allowed.has(item));
  return cleaned.length ? cleaned : fallback;
};

const normalizeShopifyOrderMode = (value: unknown) => {
  if (value === "contact_only" || value === "off" || value === "invoice" || value === "db_only") {
    return value;
  }
  return "db_only";
};

const normalizeAlegraOrderMode = (value: unknown) => {
  if (value === "draft" || value === "active" || value === "off") return value;
  return "off";
};

const normalizeProductMatchPriority = (value: unknown, fallback: "sku_barcode" | "barcode_sku") => {
  if (value === "barcode_sku" || value === "sku_barcode") return value;
  return fallback;
};

export async function listStoreConfigs() {
  const pool = getPool();
  const orgId = getOrgId();
  const settings = await getSettings();

  const stores = await pool.query<{
    shop_domain: string;
    access_token_encrypted: string;
    alegra_account_id: number | null;
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
    SELECT s.shop_domain,
           s.access_token_encrypted,
           c.alegra_account_id,
           c.transfer_destination_warehouse_id,
           c.transfer_origin_warehouse_ids,
           c.transfer_priority_warehouse_id,
           c.transfer_strategy,
           c.price_list_general_id,
           c.price_list_discount_id,
           c.price_list_wholesale_id,
           c.currency,
           c.config_json
    FROM shopify_stores s
    LEFT JOIN shopify_store_configs c
      ON c.organization_id = s.organization_id
     AND c.shop_domain = s.shop_domain
    WHERE s.organization_id = $1
    ORDER BY s.created_at DESC
    `,
    [orgId]
  );

  const defaults = {
    rules: settings.rules || {},
    invoice: settings.invoice || {},
  };

  return stores.rows.map((row) => {
    const config = (row.config_json as Record<string, unknown>) || {};
    const transfers = (config.transfers as Record<string, unknown>) || {};
    const priceLists = (config.priceLists as Record<string, unknown>) || {};
    const rules = (config.rules as Record<string, unknown>) || {};
    const invoice = (config.invoice as Record<string, unknown>) || {};
    const invoiceDefaults = (defaults.invoice as Record<string, unknown>) || {};
    const sync = (config.sync as Record<string, unknown>) || {};
    const contactSync = (sync.contacts as Record<string, unknown>) || {};
    const orderSync = (sync.orders as Record<string, unknown>) || {};
    const productSync = (sync.products as Record<string, unknown>) || {};
    return {
      shopDomain: row.shop_domain,
      alegraAccountId: row.alegra_account_id || undefined,
	      transfers: {
	        enabled: normalizeBoolean(transfers.enabled, true),
	        destinationMode: normalizeDestinationMode(transfers.destinationMode),
	        destinationRequired: normalizeBoolean(transfers.destinationRequired, true),
	        destinationWarehouseId:
	          (transfers.destinationWarehouseId as string | undefined) ||
	          row.transfer_destination_warehouse_id ||
	          defaults.invoice?.warehouseId ||
          "",
        originWarehouseIds: Array.isArray(transfers.originWarehouseIds)
          ? transfers.originWarehouseIds
          : row.transfer_origin_warehouse_ids
            ? String(row.transfer_origin_warehouse_ids).split(",").filter(Boolean)
            : defaults.rules?.warehouseIds || [],
        priorityWarehouseId:
          (transfers.priorityWarehouseId as string | undefined) ||
          row.transfer_priority_warehouse_id ||
          "",
        strategy: normalizeTransferStrategy(
          (transfers.strategy as string | undefined) || row.transfer_strategy
        ),
        fallbackStrategy: normalizeFallbackStrategy(transfers.fallbackStrategy),
        tieBreakRule: normalizeTieBreakRule(transfers.tieBreakRule),
        splitEnabled: normalizeBoolean(transfers.splitEnabled, false),
        minStock: normalizeMinStock(transfers.minStock, 0),
      },
      priceLists: {
        generalId:
          (priceLists.generalId as string | undefined) ||
          row.price_list_general_id ||
          "",
        discountId:
          (priceLists.discountId as string | undefined) ||
          row.price_list_discount_id ||
          "",
        wholesaleId:
          (priceLists.wholesaleId as string | undefined) ||
          row.price_list_wholesale_id ||
          "",
        currency: (priceLists.currency as string | undefined) || row.currency || "",
      },
      rules: {
        syncEnabled: normalizeBoolean((rules as Record<string, unknown>).syncEnabled, true),
        publishOnStock: normalizeBoolean(
          rules.publishOnStock,
          defaults.rules?.publishOnStock ?? true
        ),
        createInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).createInShopify,
          true
        ),
        updateInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).updateInShopify,
          true
        ),
        includeImages: normalizeBoolean(
          (rules as Record<string, unknown>).includeImages,
          true
        ),
        onlyActiveItems: normalizeBoolean(
          (rules as Record<string, unknown>).onlyActiveItems,
          Boolean((defaults.rules as Record<string, unknown>)?.onlyActiveItems)
        ),
        webhookItemsEnabled: normalizeBoolean(
          (rules as Record<string, unknown>).webhookItemsEnabled,
          true
        ),
        autoPublishOnWebhook: normalizeBoolean(
          rules.autoPublishOnWebhook,
          defaults.rules?.autoPublishOnWebhook ?? false
        ),
        autoPublishStatus: normalizeAutoStatus(
          rules.autoPublishStatus,
          defaults.rules?.autoPublishStatus ?? "draft"
        ),
        inventoryAdjustmentsEnabled: normalizeBoolean(
          rules.inventoryAdjustmentsEnabled,
          defaults.rules?.inventoryAdjustmentsEnabled ?? true
        ),
        inventoryAdjustmentsIntervalMinutes:
          typeof rules.inventoryAdjustmentsIntervalMinutes === "number"
            ? rules.inventoryAdjustmentsIntervalMinutes
            : typeof defaults.rules?.inventoryAdjustmentsIntervalMinutes === "number"
              ? defaults.rules?.inventoryAdjustmentsIntervalMinutes
              : 5,
        inventoryAdjustmentsAutoPublish: normalizeBoolean(
          rules.inventoryAdjustmentsAutoPublish,
          defaults.rules?.inventoryAdjustmentsAutoPublish ?? true
        ),
        warehouseIds: normalizeIdList(
          (rules as Record<string, unknown>).warehouseIds || defaults.rules?.warehouseIds || []
        ),
      },
      invoice: {
        generateInvoice: normalizeBoolean(
          invoice.generateInvoice,
          normalizeBoolean(invoiceDefaults.generateInvoice, false)
        ),
        invoiceStatus: normalizeInvoiceStatus(
          invoice.invoiceStatus,
          (invoiceDefaults as Record<string, unknown>)?.invoiceStatus
        ),
        resolutionId: normalizeText(
          invoice.resolutionId,
          normalizeText(invoiceDefaults.resolutionId, "")
        ),
        costCenterId: normalizeText(
          invoice.costCenterId,
          normalizeText(invoiceDefaults.costCenterId, "")
        ),
        warehouseId: normalizeText(
          invoice.warehouseId,
          normalizeText(invoiceDefaults.warehouseId, "")
        ),
        sellerId: normalizeText(invoice.sellerId, normalizeText(invoiceDefaults.sellerId, "")),
        paymentMethod: normalizeText(
          invoice.paymentMethod,
          normalizeText(invoiceDefaults.paymentMethod, "")
        ),
        bankAccountId: normalizeText(
          invoice.bankAccountId,
          normalizeText(invoiceDefaults.bankAccountId, "")
        ),
        applyPayment: normalizeBoolean(
          invoice.applyPayment,
          normalizeBoolean(invoiceDefaults.applyPayment, false)
        ),
        observationsTemplate: normalizeText(
          invoice.observationsTemplate,
          normalizeText(invoiceDefaults.observationsTemplate, "")
        ),
        observationsFields: normalizeObservationsFields(
          (invoice as Record<string, unknown>).observationsFields
        ),
        observationsExtra: normalizeText(
          (invoice as Record<string, unknown>).observationsExtra,
          ""
        ),
        einvoiceEnabled: normalizeBoolean(
          invoice.einvoiceEnabled,
          normalizeBoolean(invoiceDefaults.einvoiceEnabled, false)
        ),
      },
	    sync: {
	      contacts: {
	        enabled: normalizeBoolean(
	          (contactSync as Record<string, unknown>).enabled,
	          normalizeBoolean(contactSync.fromShopify, true) ||
	            normalizeBoolean(contactSync.fromAlegra, true)
	        ),
	        fromShopify: normalizeBoolean(contactSync.fromShopify, true),
	        fromAlegra: normalizeBoolean(contactSync.fromAlegra, true),
	        createInAlegra: normalizeBoolean((contactSync as Record<string, unknown>).createInAlegra, true),
	        createInShopify: normalizeBoolean((contactSync as Record<string, unknown>).createInShopify, true),
	        matchPriority: normalizeContactPriority(
	          contactSync.matchPriority,
	          ["document", "phone", "email"]
	        ),
	      },
		      orders: {
		        shopifyEnabled: normalizeBoolean(
		          (orderSync as Record<string, unknown>).shopifyEnabled,
		          normalizeShopifyOrderMode(orderSync.shopifyToAlegra) !== "off"
		        ),
		        alegraEnabled: normalizeBoolean(
		          (orderSync as Record<string, unknown>).alegraEnabled,
		          normalizeAlegraOrderMode(orderSync.alegraToShopify) !== "off"
		        ),
		        shopifyToAlegra: normalizeShopifyOrderMode(orderSync.shopifyToAlegra),
		        alegraToShopify: normalizeAlegraOrderMode(orderSync.alegraToShopify),
		      },
          products: {
            shopifyEnabled: normalizeBoolean(productSync.shopifyEnabled, false),
            createInAlegra: normalizeBoolean(productSync.createInAlegra, false),
            updateInAlegra: normalizeBoolean(productSync.updateInAlegra, true),
            includeInventory: normalizeBoolean(productSync.includeInventory, false),
            warehouseId: normalizeText(productSync.warehouseId, ""),
            matchPriority: normalizeProductMatchPriority(productSync.matchPriority, "sku_barcode"),
          },
		    },
		  };
	  });
	}

export async function getStoreConfigForDomain(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const settings = await getSettings();
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
  const defaults = {
    rules: settings.rules || {},
    invoice: settings.invoice || {},
  };
  const config = (row.config_json as Record<string, unknown>) || {};
  const transfers = (config.transfers as Record<string, unknown>) || {};
  const priceLists = (config.priceLists as Record<string, unknown>) || {};
  const rules = (config.rules as Record<string, unknown>) || {};
  const invoice = (config.invoice as Record<string, unknown>) || {};
  const invoiceDefaults = (defaults.invoice as Record<string, unknown>) || {};
  const sync = (config.sync as Record<string, unknown>) || {};
  const contactSync = (sync.contacts as Record<string, unknown>) || {};
  const orderSync = (sync.orders as Record<string, unknown>) || {};
  const productSync = (sync.products as Record<string, unknown>) || {};
  return {
    shopDomain: row.shop_domain,
	    transfers: {
	      enabled: normalizeBoolean(transfers.enabled, true),
	      destinationMode: normalizeDestinationMode(transfers.destinationMode),
	      destinationRequired: normalizeBoolean(transfers.destinationRequired, true),
	      destinationWarehouseId:
	        (transfers.destinationWarehouseId as string | undefined) ||
	        row.transfer_destination_warehouse_id ||
	        defaults.invoice?.warehouseId ||
        "",
      originWarehouseIds: Array.isArray(transfers.originWarehouseIds)
        ? transfers.originWarehouseIds
        : row.transfer_origin_warehouse_ids
          ? String(row.transfer_origin_warehouse_ids).split(",").filter(Boolean)
          : defaults.rules?.warehouseIds || [],
      priorityWarehouseId:
        (transfers.priorityWarehouseId as string | undefined) ||
        row.transfer_priority_warehouse_id ||
        "",
      strategy: normalizeTransferStrategy(
        (transfers.strategy as string | undefined) || row.transfer_strategy
      ),
      fallbackStrategy: normalizeFallbackStrategy(transfers.fallbackStrategy),
      tieBreakRule: normalizeTieBreakRule(transfers.tieBreakRule),
      splitEnabled: normalizeBoolean(transfers.splitEnabled, false),
      minStock: normalizeMinStock(transfers.minStock, 0),
    },
    priceLists: {
      generalId:
        (priceLists.generalId as string | undefined) ||
        row.price_list_general_id ||
        "",
      discountId:
        (priceLists.discountId as string | undefined) ||
        row.price_list_discount_id ||
        "",
      wholesaleId:
        (priceLists.wholesaleId as string | undefined) ||
        row.price_list_wholesale_id ||
        "",
      currency: (priceLists.currency as string | undefined) || row.currency || "",
    },
      rules: {
        syncEnabled: normalizeBoolean((rules as Record<string, unknown>).syncEnabled, true),
        publishOnStock: normalizeBoolean(
          rules.publishOnStock,
          defaults.rules?.publishOnStock ?? true
        ),
        createInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).createInShopify,
          true
        ),
        updateInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).updateInShopify,
          true
        ),
        includeImages: normalizeBoolean(
          (rules as Record<string, unknown>).includeImages,
          true
        ),
        onlyActiveItems: normalizeBoolean(
          (rules as Record<string, unknown>).onlyActiveItems,
        Boolean((defaults.rules as Record<string, unknown>)?.onlyActiveItems)
      ),
      webhookItemsEnabled: normalizeBoolean(
        (rules as Record<string, unknown>).webhookItemsEnabled,
        true
      ),
      autoPublishOnWebhook: normalizeBoolean(
        rules.autoPublishOnWebhook,
        defaults.rules?.autoPublishOnWebhook ?? false
      ),
      autoPublishStatus: normalizeAutoStatus(
        rules.autoPublishStatus,
        defaults.rules?.autoPublishStatus ?? "draft"
      ),
      inventoryAdjustmentsEnabled: normalizeBoolean(
        rules.inventoryAdjustmentsEnabled,
        defaults.rules?.inventoryAdjustmentsEnabled ?? true
      ),
      inventoryAdjustmentsIntervalMinutes:
        typeof rules.inventoryAdjustmentsIntervalMinutes === "number"
          ? rules.inventoryAdjustmentsIntervalMinutes
          : typeof defaults.rules?.inventoryAdjustmentsIntervalMinutes === "number"
            ? defaults.rules?.inventoryAdjustmentsIntervalMinutes
            : 5,
      inventoryAdjustmentsAutoPublish: normalizeBoolean(
        rules.inventoryAdjustmentsAutoPublish,
        defaults.rules?.inventoryAdjustmentsAutoPublish ?? true
      ),
      warehouseIds: normalizeIdList(
        (rules as Record<string, unknown>).warehouseIds || defaults.rules?.warehouseIds || []
      ),
    },
    invoice: {
      generateInvoice: normalizeBoolean(
        invoice.generateInvoice,
        normalizeBoolean(invoiceDefaults.generateInvoice, false)
      ),
      invoiceStatus: normalizeInvoiceStatus(
        invoice.invoiceStatus,
        (invoiceDefaults as Record<string, unknown>)?.invoiceStatus
      ),
      resolutionId: normalizeText(
        invoice.resolutionId,
        normalizeText(invoiceDefaults.resolutionId, "")
      ),
      costCenterId: normalizeText(
        invoice.costCenterId,
        normalizeText(invoiceDefaults.costCenterId, "")
      ),
      warehouseId: normalizeText(
        invoice.warehouseId,
        normalizeText(invoiceDefaults.warehouseId, "")
      ),
      sellerId: normalizeText(invoice.sellerId, normalizeText(invoiceDefaults.sellerId, "")),
      paymentMethod: normalizeText(
        invoice.paymentMethod,
        normalizeText(invoiceDefaults.paymentMethod, "")
      ),
      bankAccountId: normalizeText(
        invoice.bankAccountId,
        normalizeText(invoiceDefaults.bankAccountId, "")
      ),
      applyPayment: normalizeBoolean(
        invoice.applyPayment,
        normalizeBoolean(invoiceDefaults.applyPayment, false)
      ),
      observationsTemplate: normalizeText(
        invoice.observationsTemplate,
        normalizeText(invoiceDefaults.observationsTemplate, "")
      ),
      observationsFields: normalizeObservationsFields(
        (invoice as Record<string, unknown>).observationsFields
      ),
      observationsExtra: normalizeText(
        (invoice as Record<string, unknown>).observationsExtra,
        ""
      ),
      einvoiceEnabled: normalizeBoolean(
        invoice.einvoiceEnabled,
        normalizeBoolean(invoiceDefaults.einvoiceEnabled, false)
      ),
    },
    sync: {
      contacts: {
        fromShopify: normalizeBoolean(contactSync.fromShopify, true),
        fromAlegra: normalizeBoolean(contactSync.fromAlegra, true),
        createInAlegra: normalizeBoolean((contactSync as Record<string, unknown>).createInAlegra, true),
        createInShopify: normalizeBoolean((contactSync as Record<string, unknown>).createInShopify, true),
        matchPriority: normalizeContactPriority(
          contactSync.matchPriority,
          ["document", "phone", "email"]
        ),
      },
      orders: {
        shopifyToAlegra: normalizeShopifyOrderMode(orderSync.shopifyToAlegra),
        alegraToShopify: normalizeAlegraOrderMode(orderSync.alegraToShopify),
      },
      products: {
        shopifyEnabled: normalizeBoolean(productSync.shopifyEnabled, false),
        createInAlegra: normalizeBoolean(productSync.createInAlegra, false),
        updateInAlegra: normalizeBoolean(productSync.updateInAlegra, true),
        includeInventory: normalizeBoolean(productSync.includeInventory, false),
        warehouseId: normalizeText(productSync.warehouseId, ""),
        matchPriority: normalizeProductMatchPriority(productSync.matchPriority, "sku_barcode"),
      },
    },
  };
}

export async function saveStoreConfig(
  shopDomain: string,
  payload: Record<string, unknown>
) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) throw new Error("Dominio invalido");

  const transfers = (payload.transfers as Record<string, unknown>) || {};
  const priceLists = (payload.priceLists as Record<string, unknown>) || {};
  const sync = (payload.sync as Record<string, unknown>) || {};
  const configJson = {
    transfers,
    priceLists,
    rules: payload.rules || {},
    invoice: payload.invoice || {},
    sync,
  };

  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );

  const originIds = normalizeIdList(transfers.originWarehouseIds as string[]);

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE shopify_store_configs
      SET transfer_destination_warehouse_id = $1,
          transfer_origin_warehouse_ids = $2,
          transfer_priority_warehouse_id = $3,
          transfer_strategy = $4,
          price_list_general_id = $5,
          price_list_discount_id = $6,
          price_list_wholesale_id = $7,
          currency = $8,
          config_json = $9
      WHERE id = $10
      `,
      [
        (transfers.destinationWarehouseId as string) || null,
        originIds.length ? originIds.join(",") : null,
        (transfers.priorityWarehouseId as string) || null,
        (transfers.strategy as string) || "consolidation",
        (priceLists.generalId as string) || null,
        (priceLists.discountId as string) || null,
        (priceLists.wholesaleId as string) || null,
        (priceLists.currency as string) || null,
        configJson,
        existing.rows[0].id,
      ]
    );
  } else {
    await pool.query(
      `
      INSERT INTO shopify_store_configs
        (organization_id, shop_domain, transfer_destination_warehouse_id, transfer_origin_warehouse_ids, transfer_priority_warehouse_id, transfer_strategy, price_list_general_id, price_list_discount_id, price_list_wholesale_id, currency, config_json)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        orgId,
        domain,
        (transfers.destinationWarehouseId as string) || null,
        originIds.length ? originIds.join(",") : null,
        (transfers.priorityWarehouseId as string) || null,
        (transfers.strategy as string) || "consolidation",
        (priceLists.generalId as string) || null,
        (priceLists.discountId as string) || null,
        (priceLists.wholesaleId as string) || null,
        (priceLists.currency as string) || null,
        configJson,
      ]
    );
  }

  return { saved: true };
}

export async function getStoreCredential(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) return null;

  const store = await pool.query<{ access_token_encrypted: string }>(
    `
    SELECT access_token_encrypted
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );
  if (!store.rows.length) return null;
  const decrypted = JSON.parse(decryptString(store.rows[0].access_token_encrypted));
  return { accessToken: decrypted.accessToken as string };
}
