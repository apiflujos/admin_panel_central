import { getSettings } from "./settings.service";
import { decryptString } from "../utils/crypto";
import { getOrgId, getPool } from "../db";
import { normalizeOutOfStockBehavior } from "../../packages/shared/src/inventory";
import { normalizeSourceOfTruth } from "../../packages/shared/src/source-of-truth";

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const normalizeStoreId = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Number(parsed) : null;
};

const normalizeIdList = (value?: unknown) =>
  Array.isArray(value) ? value.map((id) => String(id)).filter(Boolean) : [];

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
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

const normalizeInvoiceStatus = (value: unknown, fallback: unknown): "draft" | "active" => {
  const resolvedFallback = fallback === "active" ? "active" : "draft";
  return value === "active" ? "active" : value === "draft" ? "draft" : resolvedFallback;
};

// Trigger de facturación POR TIENDA: on_create (al crear el pedido) u on_fulfilled
// (cuando el pedido está preparado). Permite que Becam facture al preparar y Belia
// al crear. Si la tienda no lo define, usa el valor global (fallback).
const normalizeInvoiceTrigger = (value: unknown, fallback: unknown): "on_create" | "on_fulfilled" => {
  const v = String(value ?? "").trim();
  if (v === "on_fulfilled") return "on_fulfilled";
  if (v === "on_create") return "on_create";
  return String(fallback ?? "").trim() === "on_fulfilled" ? "on_fulfilled" : "on_create";
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
  const base = Array.isArray(value) ? value : typeof value === "string" ? value.split("_") : fallback;
  const allowed = new Set(["document", "phone", "email"]);
  const cleaned = base.map((item) => String(item).toLowerCase()).filter((item) => allowed.has(item));
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

function buildNormalizedSyncConfig(params: {
  contactSync: Record<string, unknown>;
  orderSync: Record<string, unknown>;
  productSync: Record<string, unknown>;
  rules: Record<string, unknown>;
  hasCommerceConnection: boolean;
  hasAlegraConnection: boolean;
}) {
  const { contactSync, orderSync, productSync, rules, hasCommerceConnection, hasAlegraConnection } = params;
  const pairConnected = hasCommerceConnection && hasAlegraConnection;
  const trackInventoryEnabled = normalizeBoolean((rules as Record<string, unknown>).trackInventory, true);
  const shopifyToAlegra =
    orderSync.shopifyToAlegra === undefined && pairConnected
      ? "db_only"
      : normalizeShopifyOrderMode(orderSync.shopifyToAlegra);
  // Sin valor guardado: APAGADO.
  //
  // Este ajuste CREA PEDIDOS en la tienda a partir de facturas de Alegra. Tenía
  // por omisión "draft", así que en cuanto había conexión quedaba activo sin que
  // nadie lo eligiera: las dos tiendas de Becam lo tenían así, sin estar guardado.
  //
  // Es la misma forma del fallo que despublicó el catálogo el 2026-08-20: un
  // valor por omisión permisivo que ESCRIBE. Escribir en la tienda tiene que ser
  // siempre una decisión explícita.
  const alegraToShopify = normalizeAlegraOrderMode(orderSync.alegraToShopify);
  const contactsFromCommerce = normalizeBoolean(contactSync.fromShopify, hasCommerceConnection);
  const contactsFromAlegra = normalizeBoolean(contactSync.fromAlegra, hasAlegraConnection);

  return {
    contacts: {
      enabled: normalizeBoolean(
        (contactSync as Record<string, unknown>).enabled,
        contactsFromCommerce || contactsFromAlegra
      ),
      fromShopify: contactsFromCommerce,
      fromAlegra: contactsFromAlegra,
      createInAlegra: normalizeBoolean((contactSync as Record<string, unknown>).createInAlegra, hasAlegraConnection),
      createInShopify: normalizeBoolean(
        (contactSync as Record<string, unknown>).createInShopify,
        hasCommerceConnection
      ),
      matchPriority: normalizeContactPriority(contactSync.matchPriority, ["document", "phone", "email"]),
    },
    orders: {
      shopifyEnabled: normalizeBoolean((orderSync as Record<string, unknown>).shopifyEnabled, pairConnected),
      alegraEnabled: normalizeBoolean((orderSync as Record<string, unknown>).alegraEnabled, pairConnected),
      shopifyToAlegra,
      alegraToShopify,
    },
    products: {
      shopifyEnabled: normalizeBoolean(productSync.shopifyEnabled, pairConnected),
      createInAlegra: normalizeBoolean(productSync.createInAlegra, pairConnected),
      updateInAlegra: normalizeBoolean(productSync.updateInAlegra, pairConnected),
      includeInventory: normalizeBoolean(productSync.includeInventory, pairConnected && trackInventoryEnabled),
      warehouseId: normalizeText(productSync.warehouseId, ""),
      matchPriority: normalizeProductMatchPriority(productSync.matchPriority, "sku_barcode"),
    },
  };
}

/**
 * Escrituras hacia Shopify: APAGADAS por omisión.
 *
 * `updateInShopify` gobierna precios y estado de publicación. El kill switch de
 * `sync-context` comprueba `=== true`, pero eso NO bastaba: el valor llegaba ya
 * normalizado desde aquí con `true` por defecto, así que la comprobación
 * recibía siempre `true` y no bloqueaba nada. El 2026-08-20 eso despublicó
 * 1.028 productos, y volvió a despublicar 836 más tras reactivar los workers
 * creyendo que el kill switch estaba puesto.
 *
 * El valor por defecto de escribir en una tienda ajena tiene que ser NO. Para
 * activarlo hay que ponerlo explícitamente en la configuración de la tienda.
 */
const ESCRITURA_SHOPIFY_POR_OMISION = false;

export async function listStoreConfigs() {
  const pool = getPool();
  const orgId = getOrgId();
  const settings = await getSettings();

  const stores = await pool.query<{
    store_id: number;
    store_name: string;
    shop_domain: string | null;
    access_token_encrypted: string | null;
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
    config_id: number | null;
  }>(
    `
    SELECT st.id AS store_id,
           st.name AS store_name,
           COALESCE(c.shop_domain, s.shop_domain) AS shop_domain,
           s.access_token_encrypted,
           c.id AS config_id,
           -- MISMA prioridad que usa el motor (ver resolveAlegraClientForStore):
           --   1) stores.alegra_account_id  <- autoritativa, se comparte entre tiendas
           --   2) la del config de la tienda
           --   3) respaldo antiguo: alegra_accounts.store_id
           -- Faltaba la (1): con dos tiendas sobre UNA sola cuenta de Alegra, la
           -- segunda salía como "Sin cuenta asociada" en la pantalla aunque el
           -- motor la resolviera perfectamente.
           COALESCE(st.alegra_account_id, c.alegra_account_id, aa.id) AS alegra_account_id,
           c.transfer_destination_warehouse_id,
           c.transfer_origin_warehouse_ids,
           c.transfer_priority_warehouse_id,
           c.transfer_strategy,
           c.price_list_general_id,
           c.price_list_discount_id,
           c.price_list_wholesale_id,
           c.currency,
           c.config_json
    FROM stores st
    LEFT JOIN LATERAL (
      SELECT shop_domain, access_token_encrypted
      FROM shopify_stores s
      WHERE s.organization_id = st.organization_id
        AND s.store_id = st.id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT *
      FROM shopify_store_configs c
      WHERE c.organization_id = st.organization_id
        AND c.store_id = st.id
      ORDER BY c.created_at DESC
      LIMIT 1
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT id
      FROM alegra_accounts a
      WHERE a.organization_id = st.organization_id
        AND a.store_id = st.id
      ORDER BY a.created_at DESC
      LIMIT 1
    ) aa ON true
    WHERE st.organization_id = $1
    ORDER BY st.created_at DESC
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
    const hasCommerceConnection = Boolean(row.shop_domain);
    const hasAlegraConnection = Boolean(row.alegra_account_id);
    return {
      storeId: row.store_id,
      storeName: row.store_name,
      shopDomain: row.shop_domain || undefined,
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
          (transfers.priorityWarehouseId as string | undefined) || row.transfer_priority_warehouse_id || "",
        strategy: normalizeTransferStrategy((transfers.strategy as string | undefined) || row.transfer_strategy),
        fallbackStrategy: normalizeFallbackStrategy(transfers.fallbackStrategy),
        tieBreakRule: normalizeTieBreakRule(transfers.tieBreakRule),
        splitEnabled: normalizeBoolean(transfers.splitEnabled, false),
        minStock: normalizeMinStock(transfers.minStock, 0),
      },
      priceLists: {
        generalId: (priceLists.generalId as string | undefined) || row.price_list_general_id || "",
        discountId: (priceLists.discountId as string | undefined) || row.price_list_discount_id || "",
        wholesaleId: (priceLists.wholesaleId as string | undefined) || row.price_list_wholesale_id || "",
        currency: (priceLists.currency as string | undefined) || row.currency || "",
      },
      // Quién manda sobre cada área. De aquí se derivan las escrituras: no
      // hay que ajustar media docena de booleanos a mano y de forma coherente.
      // Del config_json de LA TIENDA, no de los ajustes globales: se elige por
      // tienda. Leyendo de `settings` la pantalla habría mostrado siempre lo
      // mismo para todas.
      sourceOfTruth: normalizeSourceOfTruth((config as Record<string, unknown>).sourceOfTruth),
      rules: {
        syncEnabled: normalizeBoolean((rules as Record<string, unknown>).syncEnabled, true),
        publishOnStock: normalizeBoolean(rules.publishOnStock, defaults.rules?.publishOnStock ?? true),
        createInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).createInShopify,
          ESCRITURA_SHOPIFY_POR_OMISION
        ),
        updateInShopify: normalizeBoolean(
          (rules as Record<string, unknown>).updateInShopify,
          ESCRITURA_SHOPIFY_POR_OMISION
        ),
        includeImages: normalizeBoolean((rules as Record<string, unknown>).includeImages, true),
        trackInventory: normalizeBoolean((rules as Record<string, unknown>).trackInventory, true),
        allowOversell: normalizeBoolean((rules as Record<string, unknown>).allowOversell, false),
        // Qué hacer al quedarse sin unidades. Por omisión, AGOTADO.
        outOfStockBehavior: normalizeOutOfStockBehavior((rules as Record<string, unknown>).outOfStockBehavior),
        onlyActiveItems: normalizeBoolean(
          (rules as Record<string, unknown>).onlyActiveItems,
          Boolean((defaults.rules as Record<string, unknown>)?.onlyActiveItems)
        ),
        webhookItemsEnabled: normalizeBoolean((rules as Record<string, unknown>).webhookItemsEnabled, true),
        autoPublishOnWebhook: normalizeBoolean(
          rules.autoPublishOnWebhook,
          defaults.rules?.autoPublishOnWebhook ?? false
        ),
        autoPublishStatus: normalizeAutoStatus(rules.autoPublishStatus, defaults.rules?.autoPublishStatus ?? "draft"),
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
        resolutionId: normalizeText(invoice.resolutionId, normalizeText(invoiceDefaults.resolutionId, "")),
        costCenterId: normalizeText(invoice.costCenterId, normalizeText(invoiceDefaults.costCenterId, "")),
        warehouseId: normalizeText(invoice.warehouseId, normalizeText(invoiceDefaults.warehouseId, "")),
        sellerId: normalizeText(invoice.sellerId, normalizeText(invoiceDefaults.sellerId, "")),
        paymentMethod: normalizeText(invoice.paymentMethod, normalizeText(invoiceDefaults.paymentMethod, "")),
        bankAccountId: normalizeText(invoice.bankAccountId, normalizeText(invoiceDefaults.bankAccountId, "")),
        applyPayment: normalizeBoolean(invoice.applyPayment, normalizeBoolean(invoiceDefaults.applyPayment, false)),
        observationsTemplate: normalizeText(
          invoice.observationsTemplate,
          normalizeText(invoiceDefaults.observationsTemplate, "")
        ),
        observationsFields: normalizeObservationsFields((invoice as Record<string, unknown>).observationsFields),
        observationsExtra: normalizeText((invoice as Record<string, unknown>).observationsExtra, ""),
        einvoiceEnabled: normalizeBoolean(
          invoice.einvoiceEnabled,
          normalizeBoolean(invoiceDefaults.einvoiceEnabled, false)
        ),
        invoiceTrigger: normalizeInvoiceTrigger(
          invoice.invoiceTrigger,
          (invoiceDefaults as Record<string, unknown>).invoiceTrigger
        ),
      },
      sync: buildNormalizedSyncConfig({
        contactSync,
        orderSync,
        productSync,
        rules,
        hasCommerceConnection,
        hasAlegraConnection,
      }),
    };
  });
}

async function getStoreConfigForStoreId(storeId: number) {
  const pool = getPool();
  const orgId = getOrgId();
  const settings = await getSettings();
  if (!Number.isFinite(storeId)) return null;

  const result = await pool.query<{
    shop_domain: string;
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
    SELECT shop_domain,
           -- Igual que arriba: la cuenta puede venir de la tabla stores, que es la
           -- que manda y puede estar compartida entre tiendas.
           COALESCE(
             (SELECT st.alegra_account_id FROM stores st WHERE st.id = $2),
             alegra_account_id,
             (SELECT a.id FROM alegra_accounts a
               WHERE a.organization_id = $1 AND a.store_id = $2
               ORDER BY a.created_at DESC LIMIT 1)
           ) AS alegra_account_id,
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
    WHERE organization_id = $1 AND store_id = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, storeId]
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
  const hasCommerceConnection = Boolean(row.shop_domain);
  const hasAlegraConnection = Boolean(row.alegra_account_id);
  return {
    storeId,
    shopDomain: row.shop_domain,
    // Se expone igual que en el listado. El SQL ya la resolvía —se usaba sólo
    // para `hasAlegraConnection`— pero el objeto no la devolvía, así que
    // `getStoreConfigForDomain(...).alegraAccountId` daba undefined mientras la
    // pantalla mostraba la cuenta. Las dos formas tienen que decir lo mismo.
    alegraAccountId: row.alegra_account_id || undefined,
    // Quién manda sobre cada área.
    //
    // ESTA es la función que alimenta a `buildSyncContext` (vía
    // `getStoreConfigForDomain`), no la del listado. Faltaba aquí, así que la
    // elección del cliente se guardaba y NUNCA se aplicaba: el sincronizador
    // siempre veía el valor por omisión. Hay dos funciones que construyen esta
    // forma; cualquier campo nuevo tiene que ir en LAS DOS.
    sourceOfTruth: normalizeSourceOfTruth((config as Record<string, unknown>).sourceOfTruth),
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
        (transfers.priorityWarehouseId as string | undefined) || row.transfer_priority_warehouse_id || "",
      strategy: normalizeTransferStrategy((transfers.strategy as string | undefined) || row.transfer_strategy),
      fallbackStrategy: normalizeFallbackStrategy(transfers.fallbackStrategy),
      tieBreakRule: normalizeTieBreakRule(transfers.tieBreakRule),
      splitEnabled: normalizeBoolean(transfers.splitEnabled, false),
      minStock: normalizeMinStock(transfers.minStock, 0),
    },
    priceLists: {
      generalId: (priceLists.generalId as string | undefined) || row.price_list_general_id || "",
      discountId: (priceLists.discountId as string | undefined) || row.price_list_discount_id || "",
      wholesaleId: (priceLists.wholesaleId as string | undefined) || row.price_list_wholesale_id || "",
      currency: (priceLists.currency as string | undefined) || row.currency || "",
    },
    rules: {
      syncEnabled: normalizeBoolean((rules as Record<string, unknown>).syncEnabled, true),
      publishOnStock: normalizeBoolean(rules.publishOnStock, defaults.rules?.publishOnStock ?? true),
      createInShopify: normalizeBoolean(
        (rules as Record<string, unknown>).createInShopify,
        ESCRITURA_SHOPIFY_POR_OMISION
      ),
      updateInShopify: normalizeBoolean(
        (rules as Record<string, unknown>).updateInShopify,
        ESCRITURA_SHOPIFY_POR_OMISION
      ),
      includeImages: normalizeBoolean((rules as Record<string, unknown>).includeImages, true),
      trackInventory: normalizeBoolean((rules as Record<string, unknown>).trackInventory, true),
      allowOversell: normalizeBoolean((rules as Record<string, unknown>).allowOversell, false),
      onlyActiveItems: normalizeBoolean(
        (rules as Record<string, unknown>).onlyActiveItems,
        Boolean((defaults.rules as Record<string, unknown>)?.onlyActiveItems)
      ),
      webhookItemsEnabled: normalizeBoolean((rules as Record<string, unknown>).webhookItemsEnabled, true),
      autoPublishOnWebhook: normalizeBoolean(rules.autoPublishOnWebhook, defaults.rules?.autoPublishOnWebhook ?? false),
      autoPublishStatus: normalizeAutoStatus(rules.autoPublishStatus, defaults.rules?.autoPublishStatus ?? "draft"),
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
      resolutionId: normalizeText(invoice.resolutionId, normalizeText(invoiceDefaults.resolutionId, "")),
      costCenterId: normalizeText(invoice.costCenterId, normalizeText(invoiceDefaults.costCenterId, "")),
      warehouseId: normalizeText(invoice.warehouseId, normalizeText(invoiceDefaults.warehouseId, "")),
      sellerId: normalizeText(invoice.sellerId, normalizeText(invoiceDefaults.sellerId, "")),
      paymentMethod: normalizeText(invoice.paymentMethod, normalizeText(invoiceDefaults.paymentMethod, "")),
      bankAccountId: normalizeText(invoice.bankAccountId, normalizeText(invoiceDefaults.bankAccountId, "")),
      applyPayment: normalizeBoolean(invoice.applyPayment, normalizeBoolean(invoiceDefaults.applyPayment, false)),
      observationsTemplate: normalizeText(
        invoice.observationsTemplate,
        normalizeText(invoiceDefaults.observationsTemplate, "")
      ),
      observationsFields: normalizeObservationsFields((invoice as Record<string, unknown>).observationsFields),
      observationsExtra: normalizeText((invoice as Record<string, unknown>).observationsExtra, ""),
      einvoiceEnabled: normalizeBoolean(
        invoice.einvoiceEnabled,
        normalizeBoolean(invoiceDefaults.einvoiceEnabled, false)
      ),
      invoiceTrigger: normalizeInvoiceTrigger(
        invoice.invoiceTrigger,
        (invoiceDefaults as Record<string, unknown>).invoiceTrigger
      ),
    },
    sync: buildNormalizedSyncConfig({
      contactSync,
      orderSync,
      productSync,
      rules,
      hasCommerceConnection,
      hasAlegraConnection,
    }),
  };
}

export async function getStoreConfigForDomain(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) return null;

  const store = await pool.query<{ store_id: number | null }>(
    `
    SELECT store_id
    FROM shopify_stores
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );
  const storeId = store.rows[0]?.store_id;
  if (Number.isFinite(storeId)) {
    return getStoreConfigForStoreId(Number(storeId));
  }

  const fallback = await pool.query<{ store_id: number | null }>(
    `
    SELECT store_id
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, domain]
  );
  const fallbackStoreId = fallback.rows[0]?.store_id;
  if (Number.isFinite(fallbackStoreId)) {
    return getStoreConfigForStoreId(Number(fallbackStoreId));
  }
  return null;
}

async function resolveStoreConfigTarget(storeKey: string, payload: Record<string, unknown>) {
  const pool = getPool();
  const orgId = getOrgId();
  const fromParam = normalizeStoreId(storeKey);
  const fromPayload = normalizeStoreId(payload.storeId);
  const storeId = fromParam ?? fromPayload ?? null;
  const shopDomainRaw = typeof payload.shopDomain === "string" ? payload.shopDomain : storeKey;
  const shopDomain = shopDomainRaw ? normalizeShopDomain(shopDomainRaw) : "";

  if (storeId) {
    const store = await pool.query<{ shop_domain: string | null }>(
      `
      SELECT shop_domain
      FROM shopify_stores
      WHERE organization_id = $1 AND store_id = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, storeId]
    );
    return {
      storeId,
      shopDomain: store.rows[0]?.shop_domain || shopDomain || null,
    };
  }

  if (shopDomain) {
    const store = await pool.query<{ store_id: number | null }>(
      `
      SELECT store_id
      FROM shopify_stores
      WHERE organization_id = $1 AND shop_domain = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, shopDomain]
    );
    const resolvedStoreId = store.rows[0]?.store_id || null;
    return { storeId: resolvedStoreId, shopDomain };
  }

  return { storeId: null, shopDomain: null };
}

export async function saveStoreConfig(storeKey: string, payload: Record<string, unknown>) {
  const pool = getPool();
  const orgId = getOrgId();
  const target = await resolveStoreConfigTarget(storeKey, payload);
  if (!target.storeId && !target.shopDomain) throw new Error("Tienda invalida");

  const payloadTransfers = (payload.transfers as Record<string, unknown>) || undefined;
  const payloadPriceLists = (payload.priceLists as Record<string, unknown>) || undefined;
  const payloadRules = (payload.rules as Record<string, unknown>) || undefined;
  const payloadInvoice = (payload.invoice as Record<string, unknown>) || undefined;
  const payloadSync = (payload.sync as Record<string, unknown>) || undefined;
  const payloadSourceOfTruth = (payload.sourceOfTruth as Record<string, unknown>) || undefined;

  const existing = await pool.query<{
    id: number;
    config_json: unknown;
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
    SELECT id,
           config_json,
           transfer_destination_warehouse_id,
           transfer_origin_warehouse_ids,
           transfer_priority_warehouse_id,
           transfer_strategy,
           price_list_general_id,
           price_list_discount_id,
           price_list_wholesale_id,
           currency
    FROM shopify_store_configs
    WHERE organization_id = $1
      AND (
        (store_id IS NOT NULL AND store_id = $2)
        OR (store_id IS NULL AND shop_domain = $3)
      )
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, target.storeId, target.shopDomain]
  );

  const existingConfig =
    existing.rows.length && existing.rows[0].config_json && typeof existing.rows[0].config_json === "object"
      ? (existing.rows[0].config_json as Record<string, unknown>)
      : {};
  const existingTransfers = ((existingConfig.transfers as Record<string, unknown>) || {}) as Record<string, unknown>;
  const existingPriceLists = ((existingConfig.priceLists as Record<string, unknown>) || {}) as Record<string, unknown>;
  const existingRules = ((existingConfig.rules as Record<string, unknown>) || {}) as Record<string, unknown>;
  const existingInvoice = ((existingConfig.invoice as Record<string, unknown>) || {}) as Record<string, unknown>;
  const existingSync = ((existingConfig.sync as Record<string, unknown>) || {}) as Record<string, unknown>;
  const existingSourceOfTruth = ((existingConfig.sourceOfTruth as Record<string, unknown>) || {}) as Record<
    string,
    unknown
  >;

  const transfers = payloadTransfers ? { ...existingTransfers, ...payloadTransfers } : existingTransfers;
  const priceLists = payloadPriceLists ? { ...existingPriceLists, ...payloadPriceLists } : existingPriceLists;
  const rules = payloadRules ? { ...existingRules, ...payloadRules } : existingRules;
  const invoice = payloadInvoice ? { ...existingInvoice, ...payloadInvoice } : existingInvoice;
  const sync = payloadSync
    ? {
        ...existingSync,
        ...payloadSync,
        contacts: {
          ...(((existingSync.contacts as Record<string, unknown>) || {}) as Record<string, unknown>),
          ...(((payloadSync.contacts as Record<string, unknown>) || {}) as Record<string, unknown>),
        },
        orders: {
          ...(((existingSync.orders as Record<string, unknown>) || {}) as Record<string, unknown>),
          ...(((payloadSync.orders as Record<string, unknown>) || {}) as Record<string, unknown>),
        },
        products: {
          ...(((existingSync.products as Record<string, unknown>) || {}) as Record<string, unknown>),
          ...(((payloadSync.products as Record<string, unknown>) || {}) as Record<string, unknown>),
        },
      }
    : existingSync;

  // Quién manda sobre cada área. Se NORMALIZA al guardar: un valor inválido no
  // llega a la base, y lo que no venga en el payload conserva lo que había.
  // Sin esta línea la elección se perdía: `configJson` es una lista blanca.
  const sourceOfTruth = normalizeSourceOfTruth({ ...existingSourceOfTruth, ...(payloadSourceOfTruth || {}) });

  const configJson = {
    transfers,
    priceLists,
    rules,
    invoice,
    sync,
    sourceOfTruth,
  };

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
          config_json = $9,
          store_id = COALESCE($10, store_id),
          shop_domain = COALESCE($11, shop_domain)
      WHERE id = $12
      `,
      [
        (transfers.destinationWarehouseId as string) || null,
        originIds.length ? originIds.join(",") : null,
        (transfers.priorityWarehouseId as string) || null,
        normalizeTransferStrategy(transfers.strategy) || "manual",
        (priceLists.generalId as string) || null,
        (priceLists.discountId as string) || null,
        (priceLists.wholesaleId as string) || null,
        (priceLists.currency as string) || null,
        configJson,
        target.storeId,
        target.shopDomain,
        existing.rows[0].id,
      ]
    );
  } else {
    await pool.query(
      `
      INSERT INTO shopify_store_configs
        (organization_id, shop_domain, store_id, transfer_destination_warehouse_id, transfer_origin_warehouse_ids, transfer_priority_warehouse_id, transfer_strategy, price_list_general_id, price_list_discount_id, price_list_wholesale_id, currency, config_json)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `,
      [
        orgId,
        target.shopDomain,
        target.storeId,
        (transfers.destinationWarehouseId as string) || null,
        originIds.length ? originIds.join(",") : null,
        (transfers.priorityWarehouseId as string) || null,
        normalizeTransferStrategy(transfers.strategy) || "manual",
        (priceLists.generalId as string) || null,
        (priceLists.discountId as string) || null,
        (priceLists.wholesaleId as string) || null,
        (priceLists.currency as string) || null,
        configJson,
      ]
    );
  }

  return { saved: true, storeId: target.storeId || undefined };
}

const COPYABLE_STORE_CONFIG_BLOCKS = ["transfers", "priceLists", "rules", "invoice", "sync"] as const;

type CopyableStoreConfigBlock = (typeof COPYABLE_STORE_CONFIG_BLOCKS)[number];

export async function copyStoreConfig(
  targetStoreKey: string,
  payload: {
    sourceStoreId?: number;
    blocks?: string[];
  }
) {
  const targetStoreId = normalizeStoreId(targetStoreKey);
  const sourceStoreId = normalizeStoreId(payload.sourceStoreId);
  if (!targetStoreId) throw new Error("Tienda destino invalida");
  if (!sourceStoreId) throw new Error("Tienda origen invalida");
  if (targetStoreId === sourceStoreId) {
    throw new Error("La tienda origen y destino no pueden ser la misma.");
  }

  const blocks =
    Array.isArray(payload.blocks) && payload.blocks.length
      ? payload.blocks.filter((block): block is CopyableStoreConfigBlock =>
          COPYABLE_STORE_CONFIG_BLOCKS.includes(block as CopyableStoreConfigBlock)
        )
      : [...COPYABLE_STORE_CONFIG_BLOCKS];

  if (!blocks.length) {
    throw new Error("No hay bloques validos para copiar.");
  }

  const items = await listStoreConfigs();
  const source = items.find((item) => item.storeId === sourceStoreId);
  if (!source) {
    throw new Error("No se encontro configuracion para copiar en la tienda origen.");
  }

  const nextPayload: Record<string, unknown> = {};
  for (const block of blocks) {
    nextPayload[block] = source[block];
  }

  const result = await saveStoreConfig(String(targetStoreId), nextPayload);
  return {
    ...result,
    sourceStoreId,
    targetStoreId,
    blocks,
  };
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
