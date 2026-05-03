import type { ConnectionsWorkspace, CriticalStoreConfig } from "./connections-workspace";

export type StoreConfigReadiness = {
  level: "ok" | "warn" | "critical";
  canSave: boolean;
  messages: string[];
};

function isInvoiceSetupComplete(config: CriticalStoreConfig) {
  const resolutionOk = Boolean(config.invoice.resolutionId.trim());
  if (config.invoice.einvoiceEnabled && !resolutionOk) return false;
  if (config.invoice.applyPayment) {
    if (!config.invoice.paymentMethod.trim()) return false;
    if (!config.invoice.bankAccountId.trim()) return false;
  }
  return true;
}

function isTransferSetupComplete(config: CriticalStoreConfig) {
  if (!config.transfers.enabled) return false;
  const destinationOk = !config.transfers.destinationRequired || Boolean(config.transfers.destinationWarehouseId.trim());
  if (!destinationOk) return false;
  const requiresOrigins =
    config.transfers.strategy === "manual" || config.transfers.fallbackStrategy === "manual";
  if (!requiresOrigins) return true;
  return config.transfers.originWarehouseIds.length > 0;
}

export function getEffectiveCriticalStoreConfig(
  config: CriticalStoreConfig | null,
  defaults: ConnectionsWorkspace["storeConfigDefaults"],
  storeId: number,
  storeName: string,
  shopDomain?: string
): CriticalStoreConfig {
  if (config) return config;
  return {
    storeId,
    storeName,
    shopDomain,
    transfers: {
      enabled: defaults.transfers.enabled,
      destinationRequired: defaults.transfers.destinationRequired,
      destinationWarehouseId: defaults.transfers.destinationWarehouseId,
      originWarehouseIds: defaults.transfers.originWarehouseIds,
      strategy: defaults.transfers.strategy,
      fallbackStrategy: defaults.transfers.fallbackStrategy,
    },
    rules: {
      syncEnabled: defaults.rules.syncEnabled,
      inventoryAdjustmentsEnabled: defaults.rules.inventoryAdjustmentsEnabled,
      inventoryAdjustmentsAutoPublish: defaults.rules.inventoryAdjustmentsAutoPublish,
      publishOnStock: defaults.rules.publishOnStock,
      autoPublishOnWebhook: defaults.rules.autoPublishOnWebhook,
      autoPublishStatus: defaults.rules.autoPublishStatus,
      onlyActiveItems: defaults.rules.onlyActiveItems,
      trackInventory: defaults.rules.trackInventory,
      allowOversell: defaults.rules.allowOversell,
      webhookItemsEnabled: defaults.rules.webhookItemsEnabled,
      createInShopify: defaults.rules.createInShopify,
      updateInShopify: defaults.rules.updateInShopify,
    },
    invoice: {
      generateInvoice: defaults.invoice.generateInvoice,
      resolutionId: defaults.invoice.resolutionId,
      paymentMethod: defaults.invoice.paymentMethod,
      bankAccountId: defaults.invoice.bankAccountId,
      applyPayment: defaults.invoice.applyPayment,
      einvoiceEnabled: defaults.invoice.einvoiceEnabled,
    },
    sync: {
      orders: {
        shopifyToAlegra: defaults.sync.orders.shopifyToAlegra,
        alegraToShopify: defaults.sync.orders.alegraToShopify,
      },
    },
  };
}

export function evaluateStoreConfigReadiness(config: CriticalStoreConfig): StoreConfigReadiness {
  const messages: string[] = [];
  let level: StoreConfigReadiness["level"] = "ok";
  let canSave = true;

  if (config.sync.orders.shopifyToAlegra === "invoice" && !config.invoice.generateInvoice) {
    messages.push("Shopify → Alegra está en modo factura, pero Generar factura está apagado.");
    level = "critical";
    canSave = false;
  }

  if (config.invoice.generateInvoice && config.sync.orders.shopifyToAlegra !== "invoice") {
    messages.push("Generar factura está activo, pero Shopify → Alegra no está en modo factura.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (config.sync.orders.shopifyToAlegra === "invoice") {
    if (!isTransferSetupComplete(config)) {
      messages.push("Falta completar traslados/logística para sostener el modo factura.");
      level = "critical";
      canSave = false;
    }
    if (!isInvoiceSetupComplete(config)) {
      messages.push("Falta completar facturación de Alegra para sostener el modo factura.");
      level = "critical";
      canSave = false;
    }
  }

  if (!config.rules.syncEnabled) {
    messages.push("Sync operativo está pausado para esta tienda.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (config.rules.autoPublishOnWebhook && !config.rules.syncEnabled) {
    messages.push("Auto-publicación por webhook está activa, pero el sync operativo está pausado.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (config.rules.inventoryAdjustmentsAutoPublish && !config.rules.inventoryAdjustmentsEnabled) {
    messages.push("Auto-publicar ajustes está activo, pero los ajustes de inventario están pausados.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (!config.rules.trackInventory && config.rules.allowOversell) {
    messages.push("Allow oversell no aplica cuando Track inventory está apagado.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (config.rules.trackInventory && !config.rules.syncEnabled) {
    messages.push("Track inventory activo requiere Sync operativo encendido.");
    level = level === "critical" ? "critical" : "warn";
  }

  if (!config.rules.webhookItemsEnabled && (config.rules.createInShopify || config.rules.updateInShopify)) {
    messages.push("Create/Update en Shopify siguen configurados, pero el disparo por webhooks está apagado.");
    level = level === "critical" ? "critical" : "warn";
  }

  return { level, canSave, messages };
}
