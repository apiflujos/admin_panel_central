"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { saveStoreConfig } from "../lib/api";
import { evaluateStoreConfigReadiness, getEffectiveCriticalStoreConfig } from "../lib/store-config-readiness";
import { StoreConfigsReadiness } from "./store-configs-readiness";
import { BooleanChoice } from "./ui/boolean-choice";

type CriticalStoreConfigDraft = Pick<
  CriticalStoreConfig["rules"],
  | "syncEnabled"
  | "inventoryAdjustmentsEnabled"
  | "inventoryAdjustmentsIntervalMinutes"
  | "inventoryAdjustmentsAutoPublish"
  | "publishOnStock"
  | "autoPublishOnWebhook"
  | "autoPublishStatus"
  | "onlyActiveItems"
  | "trackInventory"
  | "allowOversell"
  | "webhookItemsEnabled"
  | "createInShopify"
  | "updateInShopify"
  | "includeImages"
  | "warehouseIds"
> &
  Pick<
    CriticalStoreConfig["transfers"],
    | "enabled"
    | "destinationMode"
    | "destinationRequired"
    | "destinationWarehouseId"
    | "originWarehouseIds"
    | "priorityWarehouseId"
    | "tieBreakRule"
    | "splitEnabled"
    | "minStock"
  > &
  Pick<CriticalStoreConfig["invoice"], "generateInvoice"> & {
    shopifyToAlegra: CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"];
    alegraToShopify: CriticalStoreConfig["sync"]["orders"]["alegraToShopify"];
  };

const defaultDraft: CriticalStoreConfigDraft = {
  syncEnabled: true,
  inventoryAdjustmentsEnabled: true,
  inventoryAdjustmentsIntervalMinutes: 5,
  inventoryAdjustmentsAutoPublish: true,
  publishOnStock: true,
  autoPublishOnWebhook: false,
  autoPublishStatus: "draft",
  onlyActiveItems: false,
  trackInventory: true,
  allowOversell: false,
  webhookItemsEnabled: true,
  createInShopify: true,
  updateInShopify: true,
  includeImages: true,
  warehouseIds: [],
  enabled: true,
  destinationMode: "fixed",
  destinationRequired: true,
  destinationWarehouseId: "",
  originWarehouseIds: [],
  priorityWarehouseId: "",
  tieBreakRule: "",
  splitEnabled: false,
  minStock: 0,
  generateInvoice: false,
  shopifyToAlegra: "db_only",
  alegraToShopify: "draft",
};

function formatOrderEntryMode(value: CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"]) {
  switch (value) {
    case "db_only":
      return "Guardar pedido";
    case "contact_only":
      return "Solo contacto";
    case "invoice":
      return "Crear factura";
    case "off":
      return "Apagado";
    default:
      return value;
  }
}

function formatOrderReturnMode(value: CriticalStoreConfig["sync"]["orders"]["alegraToShopify"]) {
  switch (value) {
    case "draft":
      return "Crear borrador";
    case "active":
      return "Crear activo";
    case "off":
      return "Apagado";
    default:
      return value;
  }
}

function formatTransferStrategy(value: CriticalStoreConfig["transfers"]["strategy"] | CriticalStoreConfig["transfers"]["fallbackStrategy"]) {
  switch (value) {
    case "manual":
      return "Manual";
    case "consolidation":
      return "Consolidar";
    case "priority":
      return "Prioridad";
    case "max_stock":
      return "Mayor stock";
    case "":
      return "";
    default:
      return value;
  }
}

function normalizeIdList(values: string[]) {
  return [...values]
    .map((value) => String(value))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "es"));
}

function toDraft(config?: CriticalStoreConfig | null): CriticalStoreConfigDraft {
  if (!config) return defaultDraft;
  return {
    syncEnabled: config.rules.syncEnabled,
    inventoryAdjustmentsEnabled: config.rules.inventoryAdjustmentsEnabled,
    inventoryAdjustmentsIntervalMinutes: config.rules.inventoryAdjustmentsIntervalMinutes,
    inventoryAdjustmentsAutoPublish: config.rules.inventoryAdjustmentsAutoPublish,
    publishOnStock: config.rules.publishOnStock,
    autoPublishOnWebhook: config.rules.autoPublishOnWebhook,
    autoPublishStatus: config.rules.autoPublishStatus,
    onlyActiveItems: config.rules.onlyActiveItems,
    trackInventory: config.rules.trackInventory,
    allowOversell: config.rules.allowOversell,
    webhookItemsEnabled: config.rules.webhookItemsEnabled,
    createInShopify: config.rules.createInShopify,
    updateInShopify: config.rules.updateInShopify,
    includeImages: config.rules.includeImages,
    warehouseIds: normalizeIdList(config.rules.warehouseIds),
    enabled: config.transfers.enabled,
    destinationMode: config.transfers.destinationMode,
    destinationRequired: config.transfers.destinationRequired,
    destinationWarehouseId: config.transfers.destinationWarehouseId,
    originWarehouseIds: normalizeIdList(config.transfers.originWarehouseIds),
    priorityWarehouseId: config.transfers.priorityWarehouseId,
    tieBreakRule: config.transfers.tieBreakRule,
    splitEnabled: config.transfers.splitEnabled,
    minStock: config.transfers.minStock,
    generateInvoice: config.invoice.generateInvoice,
    shopifyToAlegra: config.sync.orders.shopifyToAlegra,
    alegraToShopify: config.sync.orders.alegraToShopify,
  };
}

function isDraftEqual(left: CriticalStoreConfigDraft, right: CriticalStoreConfigDraft) {
  return (
    left.syncEnabled === right.syncEnabled &&
    left.inventoryAdjustmentsEnabled === right.inventoryAdjustmentsEnabled &&
    left.inventoryAdjustmentsIntervalMinutes === right.inventoryAdjustmentsIntervalMinutes &&
    left.inventoryAdjustmentsAutoPublish === right.inventoryAdjustmentsAutoPublish &&
    left.publishOnStock === right.publishOnStock &&
    left.autoPublishOnWebhook === right.autoPublishOnWebhook &&
    left.autoPublishStatus === right.autoPublishStatus &&
    left.onlyActiveItems === right.onlyActiveItems &&
    left.trackInventory === right.trackInventory &&
    left.allowOversell === right.allowOversell &&
    left.webhookItemsEnabled === right.webhookItemsEnabled &&
    left.createInShopify === right.createInShopify &&
    left.updateInShopify === right.updateInShopify &&
    left.includeImages === right.includeImages &&
    left.warehouseIds.length === right.warehouseIds.length &&
    left.warehouseIds.every((value, index) => value === right.warehouseIds[index]) &&
    left.enabled === right.enabled &&
    left.destinationMode === right.destinationMode &&
    left.destinationRequired === right.destinationRequired &&
    left.destinationWarehouseId === right.destinationWarehouseId &&
    left.originWarehouseIds.length === right.originWarehouseIds.length &&
    left.originWarehouseIds.every((value, index) => value === right.originWarehouseIds[index]) &&
    left.priorityWarehouseId === right.priorityWarehouseId &&
    left.tieBreakRule === right.tieBreakRule &&
    left.splitEnabled === right.splitEnabled &&
    left.minStock === right.minStock &&
    left.generateInvoice === right.generateInvoice &&
    left.shopifyToAlegra === right.shopifyToAlegra &&
    left.alegraToShopify === right.alegraToShopify
  );
}

export function StoreConfigsCriticalPanel({
  stores,
  storeConfigs,
  defaults,
  activeStoreId,
  onStoreConfigSaved,
  mode = "all",
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
  onStoreConfigSaved: (nextConfig: CriticalStoreConfig) => void;
  mode?: "all" | "inventory";
}) {
  const [draft, setDraft] = useState<CriticalStoreConfigDraft>(defaultDraft);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [warehouseItems, setWarehouseItems] = useState<Array<{ id: string; name: string }>>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? null,
    [activeStoreId, stores]
  );
  const activeConfig = useMemo(
    () => storeConfigs.find((config) => config.storeId === activeStoreId) ?? null,
    [activeStoreId, storeConfigs]
  );
  const baseDraft = useMemo(
    () => ({
      syncEnabled: defaults.rules.syncEnabled,
      inventoryAdjustmentsEnabled: defaults.rules.inventoryAdjustmentsEnabled,
      inventoryAdjustmentsIntervalMinutes: defaults.rules.inventoryAdjustmentsIntervalMinutes,
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
      includeImages: defaults.rules.includeImages,
      warehouseIds: normalizeIdList(defaults.rules.warehouseIds),
      enabled: defaults.transfers.enabled,
      destinationMode: defaults.transfers.destinationMode,
      destinationRequired: defaults.transfers.destinationRequired,
      destinationWarehouseId: defaults.transfers.destinationWarehouseId,
      originWarehouseIds: normalizeIdList(defaults.transfers.originWarehouseIds),
      priorityWarehouseId: defaults.transfers.priorityWarehouseId,
      tieBreakRule: defaults.transfers.tieBreakRule,
      splitEnabled: defaults.transfers.splitEnabled,
      minStock: defaults.transfers.minStock,
      generateInvoice: defaults.invoice.generateInvoice,
      shopifyToAlegra: defaults.sync.orders.shopifyToAlegra,
      alegraToShopify: defaults.sync.orders.alegraToShopify,
    }),
    [defaults]
  );

  useEffect(() => {
    setDraft(activeConfig ? toDraft(activeConfig) : baseDraft);
    setSaveState("idle");
    setSaveMessage("");
  }, [activeConfig, activeStoreId, baseDraft]);

  const dirty = useMemo(
    () => !isDraftEqual(draft, activeConfig ? toDraft(activeConfig) : baseDraft),
    [activeConfig, baseDraft, draft]
  );
  const invoiceModeAlreadyActive = activeConfig?.sync.orders.shopifyToAlegra === "invoice";
  const accountingLabel = activeStore?.providers.alegra ? "Alegra" : "Contabilidad";
  const effectiveConfig = useMemo(
    () =>
      activeStore
        ? getEffectiveCriticalStoreConfig(
            activeConfig,
            defaults,
            activeStore.id,
            activeStore.name,
            activeConfig?.shopDomain ?? activeStore.providers.shopify?.shopDomain
          )
        : null,
    [activeConfig, activeStore, defaults]
  );
  const readiness = useMemo(() => {
    if (!effectiveConfig) return null;
    return evaluateStoreConfigReadiness({
      ...effectiveConfig,
      rules: {
        ...effectiveConfig.rules,
        syncEnabled: draft.syncEnabled,
        inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
        inventoryAdjustmentsIntervalMinutes: draft.inventoryAdjustmentsIntervalMinutes,
        inventoryAdjustmentsAutoPublish: draft.inventoryAdjustmentsAutoPublish,
        publishOnStock: draft.publishOnStock,
        autoPublishOnWebhook: draft.autoPublishOnWebhook,
        autoPublishStatus: draft.autoPublishStatus,
        onlyActiveItems: draft.onlyActiveItems,
        trackInventory: draft.trackInventory,
        allowOversell: draft.allowOversell,
        webhookItemsEnabled: draft.webhookItemsEnabled,
        createInShopify: draft.createInShopify,
        updateInShopify: draft.updateInShopify,
        includeImages: draft.includeImages,
        warehouseIds: draft.warehouseIds,
      },
      invoice: {
        ...effectiveConfig.invoice,
        generateInvoice: draft.generateInvoice,
      },
      sync: {
        ...effectiveConfig.sync,
        orders: {
          ...effectiveConfig.sync.orders,
          shopifyToAlegra: draft.shopifyToAlegra,
          alegraToShopify: draft.alegraToShopify,
        },
      },
      transfers: {
        ...effectiveConfig.transfers,
        enabled: draft.enabled,
        destinationMode: draft.destinationMode,
        destinationRequired: draft.destinationRequired,
        destinationWarehouseId: draft.destinationWarehouseId,
        originWarehouseIds: draft.originWarehouseIds,
        priorityWarehouseId: draft.priorityWarehouseId,
        tieBreakRule: draft.tieBreakRule,
        splitEnabled: draft.splitEnabled,
        minStock: draft.minStock,
      },
    });
  }, [draft, effectiveConfig]);
  const oversellEnabled = draft.trackInventory;
  const transferStrategy = effectiveConfig?.transfers.strategy ?? defaults.transfers.strategy;
  const transferFallbackStrategy = effectiveConfig?.transfers.fallbackStrategy ?? defaults.transfers.fallbackStrategy;
  const transferOriginsEditable = transferStrategy === "manual" || transferFallbackStrategy === "manual";
  const warehouseSummary = useMemo(() => {
    if (!warehouseItems.length) return "Sin bodegas";
    if (!draft.warehouseIds.length || draft.warehouseIds.length === warehouseItems.length) {
      return "Todas";
    }
    return `${draft.warehouseIds.length} seleccionadas`;
  }, [draft.warehouseIds, warehouseItems]);
  const transferOriginSummary = useMemo(() => {
    if (!warehouseItems.length) return "Sin bodegas";
    if (!draft.originWarehouseIds.length || draft.originWarehouseIds.length === warehouseItems.length) {
      return "Todas";
    }
    return `${draft.originWarehouseIds.length} seleccionadas`;
  }, [draft.originWarehouseIds, warehouseItems]);

  useEffect(() => {
    const shopDomain = activeConfig?.shopDomain ?? activeStore?.providers.shopify?.shopDomain ?? "";
    if (!activeStore || !shopDomain) {
      setWarehouseItems([]);
      return;
    }
    let cancelled = false;
    setWarehousesLoading(true);
    fetch(`/api/alegra/warehouses?shopDomain=${encodeURIComponent(shopDomain)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: Array<{ id?: string | number; _id?: string | number; name?: string }>;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || `warehouses_failed:${response.status}`);
        }
        const nextItems = Array.isArray(payload.items)
          ? payload.items
              .map((item) => ({
                id: String(item.id || item._id || "").trim(),
                name: String(item.name || item.id || item._id || "").trim(),
              }))
              .filter((item) => item.id)
              .sort((left, right) => left.name.localeCompare(right.name, "es"))
          : [];
        if (!cancelled) {
          setWarehouseItems(nextItems);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWarehouseItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWarehousesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeConfig?.shopDomain, activeStore]);

  async function persist() {
    if (!activeStore) {
      setSaveState("error");
      setSaveMessage("Selecciona una tienda antes de guardar.");
      return;
    }
    setSaveState("saving");
    setSaveMessage("");
    if (readiness && !readiness.canSave) {
      setSaveState("error");
      setSaveMessage("La combinación actual requiere completar el setup antes de guardar.");
      return;
    }
    const normalizedSyncEnabled = draft.trackInventory ? true : draft.syncEnabled;
    const normalizedAllowOversell = draft.trackInventory ? draft.allowOversell : false;
    const baseTransfers = activeConfig?.transfers ?? effectiveConfig?.transfers ?? defaults.transfers;
    try {
      await saveStoreConfig(String(activeStore.id), {
        storeId: activeStore.id,
        shopDomain: activeConfig?.shopDomain,
        priceLists: activeConfig?.priceLists ?? defaults.priceLists,
        transfers: {
          enabled: draft.enabled,
          destinationMode: draft.destinationMode,
          destinationRequired: draft.destinationRequired,
          destinationWarehouseId: draft.destinationWarehouseId,
          originWarehouseIds: draft.originWarehouseIds,
          strategy: baseTransfers.strategy,
          fallbackStrategy: baseTransfers.fallbackStrategy,
          priorityWarehouseId: draft.priorityWarehouseId,
          tieBreakRule: draft.tieBreakRule,
          splitEnabled: draft.splitEnabled,
          minStock: draft.minStock,
        },
        rules: {
          syncEnabled: normalizedSyncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
          inventoryAdjustmentsIntervalMinutes: draft.inventoryAdjustmentsIntervalMinutes,
          inventoryAdjustmentsAutoPublish: draft.inventoryAdjustmentsAutoPublish,
          publishOnStock: draft.publishOnStock,
          autoPublishOnWebhook: draft.autoPublishOnWebhook,
          autoPublishStatus: draft.autoPublishStatus,
          onlyActiveItems: draft.onlyActiveItems,
          trackInventory: draft.trackInventory,
          allowOversell: normalizedAllowOversell,
          webhookItemsEnabled: draft.webhookItemsEnabled,
          createInShopify: draft.createInShopify,
          updateInShopify: draft.updateInShopify,
          includeImages: draft.includeImages,
          warehouseIds: draft.warehouseIds,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
          resolutionId:
            activeConfig?.invoice.resolutionId ??
            effectiveConfig?.invoice.resolutionId ??
            defaults.invoice.resolutionId,
          paymentMethod:
            activeConfig?.invoice.paymentMethod ??
            effectiveConfig?.invoice.paymentMethod ??
            defaults.invoice.paymentMethod,
          bankAccountId:
            activeConfig?.invoice.bankAccountId ??
            effectiveConfig?.invoice.bankAccountId ??
            defaults.invoice.bankAccountId,
          applyPayment:
            activeConfig?.invoice.applyPayment ??
            effectiveConfig?.invoice.applyPayment ??
            defaults.invoice.applyPayment,
          einvoiceEnabled:
            activeConfig?.invoice.einvoiceEnabled ??
            effectiveConfig?.invoice.einvoiceEnabled ??
            defaults.invoice.einvoiceEnabled,
        },
        sync: {
          contacts: activeConfig?.sync.contacts ?? effectiveConfig?.sync.contacts ?? defaults.sync.contacts,
          orders: {
            shopifyEnabled:
              activeConfig?.sync.orders.shopifyEnabled ??
              effectiveConfig?.sync.orders.shopifyEnabled ??
              defaults.sync.orders.shopifyEnabled,
            alegraEnabled:
              activeConfig?.sync.orders.alegraEnabled ??
              effectiveConfig?.sync.orders.alegraEnabled ??
              defaults.sync.orders.alegraEnabled,
            shopifyToAlegra: draft.shopifyToAlegra,
            alegraToShopify: draft.alegraToShopify,
          },
          products: activeConfig?.sync.products ?? effectiveConfig?.sync.products ?? defaults.sync.products,
        },
      });
      onStoreConfigSaved({
        storeId: activeStore.id,
        storeName: activeStore.name,
        shopDomain: activeConfig?.shopDomain ?? activeStore.providers.shopify?.shopDomain,
        priceLists: activeConfig?.priceLists ?? defaults.priceLists,
        transfers: {
          enabled: draft.enabled,
          destinationMode: draft.destinationMode,
          destinationRequired: draft.destinationRequired,
          destinationWarehouseId: draft.destinationWarehouseId,
          originWarehouseIds: draft.originWarehouseIds,
          strategy: baseTransfers.strategy,
          fallbackStrategy: baseTransfers.fallbackStrategy,
          priorityWarehouseId: draft.priorityWarehouseId,
          tieBreakRule: draft.tieBreakRule,
          splitEnabled: draft.splitEnabled,
          minStock: draft.minStock,
        },
        rules: {
          syncEnabled: normalizedSyncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
          inventoryAdjustmentsIntervalMinutes: draft.inventoryAdjustmentsIntervalMinutes,
          inventoryAdjustmentsAutoPublish: draft.inventoryAdjustmentsAutoPublish,
          publishOnStock: draft.publishOnStock,
          autoPublishOnWebhook: draft.autoPublishOnWebhook,
          autoPublishStatus: draft.autoPublishStatus,
          onlyActiveItems: draft.onlyActiveItems,
          trackInventory: draft.trackInventory,
          allowOversell: normalizedAllowOversell,
          webhookItemsEnabled: draft.webhookItemsEnabled,
          createInShopify: draft.createInShopify,
          updateInShopify: draft.updateInShopify,
          includeImages: draft.includeImages,
          warehouseIds: draft.warehouseIds,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
          resolutionId:
            activeConfig?.invoice.resolutionId ??
            effectiveConfig?.invoice.resolutionId ??
            defaults.invoice.resolutionId,
          paymentMethod:
            activeConfig?.invoice.paymentMethod ??
            effectiveConfig?.invoice.paymentMethod ??
            defaults.invoice.paymentMethod,
          bankAccountId:
            activeConfig?.invoice.bankAccountId ??
            effectiveConfig?.invoice.bankAccountId ??
            defaults.invoice.bankAccountId,
          applyPayment:
            activeConfig?.invoice.applyPayment ??
            effectiveConfig?.invoice.applyPayment ??
            defaults.invoice.applyPayment,
          einvoiceEnabled:
            activeConfig?.invoice.einvoiceEnabled ??
            effectiveConfig?.invoice.einvoiceEnabled ??
            defaults.invoice.einvoiceEnabled,
        },
        sync: {
          contacts: activeConfig?.sync.contacts ?? effectiveConfig?.sync.contacts ?? defaults.sync.contacts,
          orders: {
            shopifyEnabled:
              activeConfig?.sync.orders.shopifyEnabled ??
              effectiveConfig?.sync.orders.shopifyEnabled ??
              defaults.sync.orders.shopifyEnabled,
            alegraEnabled:
              activeConfig?.sync.orders.alegraEnabled ??
              effectiveConfig?.sync.orders.alegraEnabled ??
              defaults.sync.orders.alegraEnabled,
            shopifyToAlegra: draft.shopifyToAlegra,
            alegraToShopify: draft.alegraToShopify,
          },
          products: activeConfig?.sync.products ?? effectiveConfig?.sync.products ?? defaults.sync.products,
        },
      });
      setSaveState("saved");
      setSaveMessage("Configuración crítica guardada por tienda.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    }
  }

  return (
    <section className="card connection-card settings-density-compact">
      <div className="connection-card-head">
        <div>
          <h3>{mode === "inventory" ? "Inventario y bodegas" : "Sincronización crítica por tienda"}</h3>
          <p>
            {mode === "inventory"
              ? "Activo, cron y publicación."
              : "Sync e inventario."}
          </p>
        </div>
        {activeStore ? <span className="pill">Tienda #{activeStore.id}</span> : null}
      </div>

      {!activeStore ? (
        <p className="connection-inline-note">Selecciona una tienda para editar su configuración crítica.</p>
      ) : null}

      {readiness ? <StoreConfigsReadiness readiness={readiness} /> : null}

      <div className="store-configs-grid">
        {mode === "all" ? (
          <div className="settings-subsection store-config-field-span-2">
            <div className="settings-subsection-head">
              <strong>Flujo core</strong>
              <span>Base</span>
            </div>
            <div className="store-configs-grid">
              <BooleanChoice
                label="Sync activo"
                value={draft.trackInventory ? true : draft.syncEnabled}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    syncEnabled: next,
                  }))
                }
                positive="Activa"
                negative="Pausada"
                help="Pausa la operación sin desmontar la conexión. Si controlas inventario, queda activa por diseño."
                disabled={draft.trackInventory}
              />

              <label className="store-config-field">
                <span>Shopify → Alegra</span>
                <select
                  className="input"
                  value={draft.shopifyToAlegra}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      shopifyToAlegra: event.target.value as CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"],
                    }))
                  }
                >
                  <option value="db_only">Guardar pedido</option>
                  <option value="contact_only">Solo contacto</option>
                  {invoiceModeAlreadyActive ? <option value="invoice">Crear factura</option> : null}
                  <option value="off">Apagado</option>
                </select>
              </label>

              <label className="store-config-field">
                <span>Alegra → Shopify</span>
                <select
                  className="input"
                  value={draft.alegraToShopify}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      alegraToShopify: event.target.value as CriticalStoreConfig["sync"]["orders"]["alegraToShopify"],
                    }))
                  }
                >
                  <option value="off">Apagado</option>
                  <option value="draft">Crear borrador</option>
                  <option value="active">Crear activo</option>
                </select>
              </label>

              <BooleanChoice
                label="Factura activa"
                value={draft.generateInvoice}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    generateInvoice: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Activa la intención de facturar; los catálogos y pagos se resuelven en facturación global."
              />
            </div>
          </div>
        ) : null}

        <details className="settings-collapsible store-config-field-span-2">
          <summary className="settings-collapsible-summary">
            <strong>Traslados y destino</strong>
            <span>Origen y destino</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Traslados activos"
                value={draft.enabled}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    enabled: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Define si esta tienda usa la lógica de traslados entre bodegas."
              />

              <label className="store-config-field">
                <span>Destino</span>
                <select
                  className="input"
                  value={draft.destinationMode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      destinationMode: event.target.value as CriticalStoreConfig["transfers"]["destinationMode"],
                    }))
                  }
                  disabled={!draft.enabled}
                >
                  <option value="fixed">Fijo</option>
                  <option value="auto">Auto</option>
                  <option value="rule">Por regla</option>
                </select>
              </label>

              <BooleanChoice
                label="Exigir bodega destino"
                value={draft.destinationRequired}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    destinationRequired: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Obliga a fijar una bodega destino antes de operar."
                disabled={!draft.enabled}
              />

              <label className="store-config-field">
                <span>Bodega destino</span>
                <select
                  className="input"
                  value={draft.destinationWarehouseId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      destinationWarehouseId: event.target.value,
                    }))
                  }
                  disabled={
                    !draft.enabled || draft.destinationMode !== "fixed" || warehousesLoading || !warehouseItems.length
                  }
                >
                  <option value="">{draft.destinationRequired ? "Selecciona una bodega" : "Sin destino fijo"}</option>
                  {warehouseItems.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                <small>Solo aplica si el destino es fijo.</small>
              </label>

              <label className="store-config-field">
                <span>Bodega prioritaria</span>
                <select
                  className="input"
                  value={draft.priorityWarehouseId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priorityWarehouseId: event.target.value,
                    }))
                  }
                  disabled={!draft.enabled || warehousesLoading || !warehouseItems.length}
                >
                  <option value="">Sin prioridad</option>
                  {warehouseItems.map((warehouse) => (
                    <option key={`priority-${warehouse.id}`} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="store-config-field">
                <span>Desempate</span>
                <select
                  className="input"
                  value={draft.tieBreakRule}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tieBreakRule: event.target.value as CriticalStoreConfig["transfers"]["tieBreakRule"],
                    }))
                  }
                  disabled={!draft.enabled}
                >
                  <option value="">Sin regla</option>
                  <option value="priority">Bodega prioritaria</option>
                  <option value="max_stock">Mayor stock</option>
                  <option value="random">Balanceado</option>
                </select>
              </label>

              <BooleanChoice
                label="Split por bodega"
                value={draft.splitEnabled}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    splitEnabled: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Permite repartir stock entre varias bodegas cuando hace falta."
                disabled={!draft.enabled}
              />

              <label className="store-config-field">
                <span>Stock mínimo</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={1}
                  value={String(draft.minStock)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minStock: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                  disabled={!draft.enabled}
                />
                <small>Umbral mínimo para considerar una bodega como elegible.</small>
              </label>
            </div>
            <div className="page-module-actions compact-pills">
              <span className={`pill ${draft.syncEnabled ? "pill-ok" : "pill-warn"}`}>
                Sync {draft.syncEnabled ? "activo" : "pausado"}
              </span>
              <span className="pill">Entrada {formatOrderEntryMode(draft.shopifyToAlegra)}</span>
              <span className={`pill ${draft.alegraToShopify !== "off" ? "pill-ok" : ""}`}>
                Retorno {formatOrderReturnMode(draft.alegraToShopify)}
              </span>
              <span className={`pill ${draft.generateInvoice ? "pill-ok" : ""}`}>
                Factura {draft.generateInvoice ? "activa" : "apagada"}
              </span>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Inventario y automatización</strong>
            <span>Frecuencia y stock</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Ajustes de inventario"
                value={draft.inventoryAdjustmentsEnabled}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    inventoryAdjustmentsEnabled: next,
                  }))
                }
                positive="Activos"
                negative="Pausados"
                help="Pausa los ajustes automáticos sin desmontar la conexión."
              />

              <label className="store-config-field">
                <span>Cron de revisión</span>
                <select
                  className="input"
                  value={String(draft.inventoryAdjustmentsIntervalMinutes)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inventoryAdjustmentsIntervalMinutes: Math.max(5, Number(event.target.value || 5)),
                    }))
                  }
                >
                  <option value="5">Cada 5 minutos</option>
                  <option value="10">Cada 10 minutos</option>
                  <option value="15">Cada 15 minutos</option>
                </select>
              </label>

              <BooleanChoice
                label={`Activo en ${accountingLabel}`}
                value={draft.trackInventory}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    trackInventory: next,
                    syncEnabled: next ? true : current.syncEnabled,
                    allowOversell: next ? current.allowOversell : false,
                  }))
                }
                positive="Activo"
                negative="Apagado"
                help="Si está activo, la sincronización operativa no puede quedar apagada."
              />

              <BooleanChoice
                label="Sobreventa"
                value={draft.trackInventory ? draft.allowOversell : false}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    allowOversell: current.trackInventory ? next : false,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Solo aplica cuando el control de inventario está activo."
                disabled={!oversellEnabled}
              />

              <BooleanChoice
                label="Webhook activo"
                value={draft.webhookItemsEnabled}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    webhookItemsEnabled: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Permite que cambios entrantes disparen automatizaciones de catálogo."
              />

              <BooleanChoice
                label="Crear en tienda"
                value={draft.createInShopify}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    createInShopify: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Permite crear productos nuevos automáticamente."
              />

              <BooleanChoice
                label="Actualizar en tienda"
                value={draft.updateInShopify}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    updateInShopify: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Permite actualizar productos existentes automáticamente."
              />

              <BooleanChoice
                label="Exigir imágenes"
                value={draft.includeImages}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    includeImages: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help={`Evita publicar productos sin imágenes cuando el catálogo viene desde ${accountingLabel}.`}
              />
            </div>
            <div className="page-module-actions compact-pills">
              <span className={`pill ${draft.inventoryAdjustmentsEnabled ? "pill-ok" : "pill-warn"}`}>
                Ajustes {draft.inventoryAdjustmentsEnabled ? "activos" : "pausados"}
              </span>
              <span className="pill">Cron {draft.inventoryAdjustmentsIntervalMinutes} min</span>
              <span className={`pill ${draft.trackInventory ? "pill-ok" : ""}`}>
                Inventario en {accountingLabel} {draft.trackInventory ? "activo" : "apagado"}
              </span>
              <span className={`pill ${draft.publishOnStock ? "pill-ok" : ""}`}>
                Publicar con stock {draft.publishOnStock ? "sí" : "no"}
              </span>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2">
          <summary className="settings-collapsible-summary">
            <strong>Bodegas y publicación final</strong>
            <span>Selección y publicación</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <div className="store-config-field store-config-field-span-2">
                <span>Bodegas activas</span>
                <div className="store-warehouse-card">
                  <div className="store-warehouse-head">
                    <strong>{warehouseSummary}</strong>
                    <span>{warehousesLoading ? "Cargando…" : `${warehouseItems.length} disponibles`}</span>
                  </div>
                  <div className="store-warehouse-grid">
                    {warehouseItems.length ? (
                      warehouseItems.map((warehouse) => {
                        const checked = draft.warehouseIds.includes(warehouse.id);
                        return (
                          <label className="store-warehouse-option" key={warehouse.id}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setDraft((current) => {
                                  const next = new Set(current.warehouseIds);
                                  if (event.target.checked) {
                                    next.add(warehouse.id);
                                  } else {
                                    next.delete(warehouse.id);
                                  }
                                  return {
                                    ...current,
                                    warehouseIds: normalizeIdList(Array.from(next)),
                                  };
                                })
                              }
                            />
                            <span>{warehouse.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <span className="connection-inline-note">
                        {activeStore
                          ? "Sin bodegas cargadas para esta tienda."
                          : "Selecciona una tienda con Shopify o Alegra."}
                      </span>
                    )}
                  </div>
                  {warehouseItems.length ? (
                    <div className="connection-card-actions">
                      <button
                        className="btn ghost btn-compact"
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            warehouseIds: normalizeIdList(warehouseItems.map((item) => item.id)),
                          }))
                        }
                      >
                        Seleccionar todas
                      </button>
                      <button
                        className="btn ghost btn-compact"
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            warehouseIds: [],
                          }))
                        }
                      >
                        Usar todas
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="store-config-field store-config-field-span-2">
                <span>Bodegas origen</span>
                <div className="store-warehouse-card">
                  <div className="store-warehouse-head">
                    <strong>{transferOriginSummary}</strong>
                    <span>{warehousesLoading ? "Cargando…" : `${warehouseItems.length} disponibles`}</span>
                  </div>
                  <div className="store-warehouse-grid">
                    {warehouseItems.length ? (
                      warehouseItems.map((warehouse) => {
                        const checked = draft.originWarehouseIds.includes(warehouse.id);
                        return (
                          <label className="store-warehouse-option" key={`origin-${warehouse.id}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!draft.enabled || !transferOriginsEditable}
                              onChange={(event) =>
                                setDraft((current) => {
                                  const next = new Set(current.originWarehouseIds);
                                  if (event.target.checked) {
                                    next.add(warehouse.id);
                                  } else {
                                    next.delete(warehouse.id);
                                  }
                                  return {
                                    ...current,
                                    originWarehouseIds: normalizeIdList(Array.from(next)),
                                  };
                                })
                              }
                            />
                            <span>{warehouse.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <span className="connection-inline-note">
                        {activeStore
                          ? "Sin bodegas cargadas para esta tienda."
                          : "Selecciona una tienda con Shopify o Alegra."}
                      </span>
                    )}
                  </div>
                  <div className="connection-card-actions">
                    <span>
                      Estrategia actual: <strong>{formatTransferStrategy(transferStrategy)}</strong>
                      {transferFallbackStrategy ? (
                        <>
                          {" "}
                          · Respaldo <strong>{formatTransferStrategy(transferFallbackStrategy)}</strong>
                        </>
                      ) : null}
                      {draft.priorityWarehouseId ? (
                        <>
                          {" "}
                          · Prioridad <strong>{draft.priorityWarehouseId}</strong>
                        </>
                      ) : null}
                    </span>
                    {warehouseItems.length ? (
                      <button
                        className="btn ghost btn-compact"
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            originWarehouseIds: normalizeIdList(warehouseItems.map((item) => item.id)),
                          }))
                        }
                        disabled={!draft.enabled || !transferOriginsEditable}
                      >
                        Seleccionar todas
                      </button>
                    ) : null}
                    {warehouseItems.length ? (
                      <button
                        className="btn ghost btn-compact"
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            originWarehouseIds: [],
                          }))
                        }
                        disabled={!draft.enabled || !transferOriginsEditable}
                      >
                        Usar todas
                      </button>
                    ) : null}
                  </div>
                  {!transferOriginsEditable ? (
                    <p className="connection-inline-note">
                      La selección de orígenes queda en solo lectura mientras la tienda use una estrategia avanzada.
                    </p>
                  ) : null}
                </div>
              </div>

              <BooleanChoice
                label="Publicar con stock"
                value={draft.publishOnStock}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    publishOnStock: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Solo publica ítems que tengan stock disponible."
              />

              <BooleanChoice
                label="Publicar desde webhook"
                value={draft.autoPublishOnWebhook}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    autoPublishOnWebhook: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Publica automáticamente cuando entra un cambio por webhook."
              />

              <label className="store-config-field">
                <span>Estado al publicar</span>
                <select
                  className="input"
                  value={draft.autoPublishStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      autoPublishStatus: event.target.value as CriticalStoreConfig["rules"]["autoPublishStatus"],
                    }))
                  }
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                </select>
              </label>

              <BooleanChoice
                label="Solo activos"
                value={draft.onlyActiveItems}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    onlyActiveItems: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Evita publicar ítems inactivos en el flujo automático."
              />

              <BooleanChoice
                label="Publicar ajustes"
                value={draft.inventoryAdjustmentsAutoPublish}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    inventoryAdjustmentsAutoPublish: next,
                  }))
                }
                positive="Sí"
                negative="No"
                help="Permite publicar automáticamente cuando corren ajustes de inventario."
              />
            </div>
          </div>
        </details>
      </div>

      <div className="connection-card-actions">
        <span>
          {activeConfig
            ? "Configuración específica de esta tienda ya persistida."
            : "Esta tienda aún no tiene configuración propia; el formulario parte de defaults globales y el primer guardado la crea."}
        </span>
        <button
          className="btn primary btn-compact"
          type="button"
          disabled={!activeStore || !dirty || saveState === "saving" || Boolean(readiness && !readiness.canSave)}
          onClick={() => void persist()}
        >
          {saveState === "saving" ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>

      {saveMessage ? (
        <p className={`connection-inline-note${saveState === "error" ? " connection-inline-note-error" : ""}`}>
          {saveMessage}
        </p>
      ) : null}
      {!invoiceModeAlreadyActive ? (
        <p className="connection-inline-note">
          El modo factura directo de Shopify a Alegra sigue controlado aparte hasta terminar de migrar sus validaciones.
        </p>
      ) : null}
    </section>
  );
}
