"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { saveStoreConfig } from "../lib/api";
import { evaluateStoreConfigReadiness, getEffectiveCriticalStoreConfig } from "../lib/store-config-readiness";
import { StoreConfigsReadiness } from "./store-configs-readiness";

type CriticalStoreConfigDraft = Pick<
  CriticalStoreConfig["rules"],
  | "syncEnabled"
  | "inventoryAdjustmentsEnabled"
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
  | "warehouseIds"
> &
  Pick<CriticalStoreConfig["invoice"], "generateInvoice"> & {
    shopifyToAlegra: CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"];
    alegraToShopify: CriticalStoreConfig["sync"]["orders"]["alegraToShopify"];
  };

const defaultDraft: CriticalStoreConfigDraft = {
  syncEnabled: true,
  inventoryAdjustmentsEnabled: true,
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
  warehouseIds: [],
  generateInvoice: false,
  shopifyToAlegra: "db_only",
  alegraToShopify: "off",
};

function normalizeIdList(values: string[]) {
  return [...values].map((value) => String(value)).filter(Boolean).sort((left, right) => left.localeCompare(right, "es"));
}

function toDraft(config?: CriticalStoreConfig | null): CriticalStoreConfigDraft {
  if (!config) return defaultDraft;
  return {
    syncEnabled: config.rules.syncEnabled,
    inventoryAdjustmentsEnabled: config.rules.inventoryAdjustmentsEnabled,
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
    warehouseIds: normalizeIdList(config.rules.warehouseIds),
    generateInvoice: config.invoice.generateInvoice,
    shopifyToAlegra: config.sync.orders.shopifyToAlegra,
    alegraToShopify: config.sync.orders.alegraToShopify,
  };
}

function isDraftEqual(left: CriticalStoreConfigDraft, right: CriticalStoreConfigDraft) {
  return (
    left.syncEnabled === right.syncEnabled &&
    left.inventoryAdjustmentsEnabled === right.inventoryAdjustmentsEnabled &&
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
    left.warehouseIds.length === right.warehouseIds.length &&
    left.warehouseIds.every((value, index) => value === right.warehouseIds[index]) &&
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
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
  onStoreConfigSaved: (nextConfig: CriticalStoreConfig) => void;
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
      warehouseIds: normalizeIdList(defaults.rules.warehouseIds),
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
    });
  }, [draft, effectiveConfig]);
  const oversellEnabled = draft.trackInventory;
  const warehouseSummary = useMemo(() => {
    if (!warehouseItems.length) return "Sin bodegas";
    if (!draft.warehouseIds.length || draft.warehouseIds.length === warehouseItems.length) {
      return "Todas";
    }
    return `${draft.warehouseIds.length} seleccionadas`;
  }, [draft.warehouseIds, warehouseItems]);

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
    try {
      await saveStoreConfig(String(activeStore.id), {
        storeId: activeStore.id,
        shopDomain: activeConfig?.shopDomain,
        rules: {
          syncEnabled: normalizedSyncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
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
          warehouseIds: draft.warehouseIds,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
          resolutionId: activeConfig?.invoice.resolutionId ?? effectiveConfig?.invoice.resolutionId ?? defaults.invoice.resolutionId,
          paymentMethod:
            activeConfig?.invoice.paymentMethod ?? effectiveConfig?.invoice.paymentMethod ?? defaults.invoice.paymentMethod,
          bankAccountId:
            activeConfig?.invoice.bankAccountId ?? effectiveConfig?.invoice.bankAccountId ?? defaults.invoice.bankAccountId,
          applyPayment:
            activeConfig?.invoice.applyPayment ?? effectiveConfig?.invoice.applyPayment ?? defaults.invoice.applyPayment,
          einvoiceEnabled:
            activeConfig?.invoice.einvoiceEnabled ?? effectiveConfig?.invoice.einvoiceEnabled ?? defaults.invoice.einvoiceEnabled,
        },
        sync: {
          orders: {
            shopifyToAlegra: draft.shopifyToAlegra,
            alegraToShopify: draft.alegraToShopify,
          },
        },
      });
      onStoreConfigSaved({
        storeId: activeStore.id,
        storeName: activeStore.name,
        shopDomain: activeConfig?.shopDomain ?? activeStore.providers.shopify?.shopDomain,
        transfers: activeConfig?.transfers ?? effectiveConfig?.transfers ?? {
          enabled: defaults.transfers.enabled,
          destinationRequired: defaults.transfers.destinationRequired,
          destinationWarehouseId: defaults.transfers.destinationWarehouseId,
          originWarehouseIds: defaults.transfers.originWarehouseIds,
          strategy: defaults.transfers.strategy,
          fallbackStrategy: defaults.transfers.fallbackStrategy,
        },
        rules: {
          syncEnabled: normalizedSyncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
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
          warehouseIds: draft.warehouseIds,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
          resolutionId: activeConfig?.invoice.resolutionId ?? effectiveConfig?.invoice.resolutionId ?? defaults.invoice.resolutionId,
          paymentMethod:
            activeConfig?.invoice.paymentMethod ?? effectiveConfig?.invoice.paymentMethod ?? defaults.invoice.paymentMethod,
          bankAccountId:
            activeConfig?.invoice.bankAccountId ?? effectiveConfig?.invoice.bankAccountId ?? defaults.invoice.bankAccountId,
          applyPayment:
            activeConfig?.invoice.applyPayment ?? effectiveConfig?.invoice.applyPayment ?? defaults.invoice.applyPayment,
          einvoiceEnabled:
            activeConfig?.invoice.einvoiceEnabled ?? effectiveConfig?.invoice.einvoiceEnabled ?? defaults.invoice.einvoiceEnabled,
        },
        sync: {
          orders: {
            shopifyToAlegra: draft.shopifyToAlegra,
            alegraToShopify: draft.alegraToShopify,
          },
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
    <section className="card connection-card">
      <div className="connection-card-head">
        <div>
          <h3>Sync crítico por tienda</h3>
          <p>Primer bloque mutativo portado desde el legacy sin tocar defaults globales.</p>
        </div>
        {activeStore ? <span className="pill">Store #{activeStore.id}</span> : null}
      </div>

      {!activeStore ? (
        <p className="connection-inline-note">Selecciona una tienda para editar su configuración crítica.</p>
      ) : null}

      {readiness ? <StoreConfigsReadiness readiness={readiness} /> : null}

      <div className="store-configs-grid">
        <label className="store-config-field">
          <span>Sync operativo</span>
          <select
            className="input"
            value={(draft.trackInventory ? true : draft.syncEnabled) ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({ ...current, syncEnabled: event.target.value === "true" }))
            }
            disabled={draft.trackInventory}
          >
            <option value="true">Activa</option>
            <option value="false">Pausada</option>
          </select>
          <small>Pausa envíos operativos. Si Track inventory está activo, legacy fuerza este valor a activo.</small>
        </label>

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
            <option value="db_only">Solo base de datos</option>
            <option value="contact_only">Solo contacto</option>
            {invoiceModeAlreadyActive ? <option value="invoice">Factura</option> : null}
            <option value="off">Apagado</option>
          </select>
          <small>
            Define si el pedido solo se registra o crea contacto. La activación nueva de factura sigue contenida en
            legacy hasta portar sus validaciones.
          </small>
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
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
          </select>
          <small>Controla si el flujo inverso crea borradores o publica activos.</small>
        </label>

        <label className="store-config-field">
          <span>Generar factura</span>
          <select
            className="input"
            value={draft.generateInvoice ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({ ...current, generateInvoice: event.target.value === "true" }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>No toca todavía resolución, bodega ni método de pago.</small>
        </label>

        <label className="store-config-field">
          <span>Ajustes de inventario</span>
          <select
            className="input"
            value={draft.inventoryAdjustmentsEnabled ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                inventoryAdjustmentsEnabled: event.target.value === "true",
              }))
            }
          >
            <option value="true">Activos</option>
            <option value="false">Pausados</option>
          </select>
          <small>Pausa los ajustes automáticos por tienda sin desmontar la conexión.</small>
        </label>

        <label className="store-config-field">
          <span>Track inventory</span>
          <select
            className="input"
            value={draft.trackInventory ? "true" : "false"}
            onChange={(event) => {
              const nextValue = event.target.value === "true";
              setDraft((current) => ({
                ...current,
                trackInventory: nextValue,
                syncEnabled: nextValue ? true : current.syncEnabled,
                allowOversell: nextValue ? current.allowOversell : false,
              }));
            }}
          >
            <option value="true">Activo</option>
            <option value="false">Apagado</option>
          </select>
          <small>Al activarlo, el legacy mantiene Sync operativo encendido.</small>
        </label>

        <label className="store-config-field">
          <span>Allow oversell</span>
          <select
            className="input"
            value={(draft.trackInventory ? draft.allowOversell : false) ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                allowOversell: current.trackInventory ? event.target.value === "true" : false,
              }))
            }
            disabled={!oversellEnabled}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>No aplica si Track inventory está apagado.</small>
        </label>

        <label className="store-config-field">
          <span>Webhook items enabled</span>
          <select
            className="input"
            value={draft.webhookItemsEnabled ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                webhookItemsEnabled: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Controla si los cambios de items por webhook disparan automatización.</small>
        </label>

        <label className="store-config-field">
          <span>Create in Shopify</span>
          <select
            className="input"
            value={draft.createInShopify ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                createInShopify: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Permite crear productos nuevos en Shopify desde el flujo automático.</small>
        </label>

        <label className="store-config-field">
          <span>Update in Shopify</span>
          <select
            className="input"
            value={draft.updateInShopify ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                updateInShopify: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Permite actualizar productos existentes en Shopify desde el flujo automático.</small>
        </label>

        <div className="store-config-field store-config-field-span-2">
          <span>Bodegas de inventario</span>
          <small>Sin selección explícita, la tienda opera con todas las bodegas disponibles.</small>
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
                  {activeStore ? "Sin bodegas cargadas para esta tienda." : "Selecciona una tienda con Shopify/Alegra."}
                </span>
              )}
            </div>
            {warehouseItems.length ? (
              <div className="connection-card-actions">
                <button
                  className="btn btn-ghost btn-compact"
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

        <label className="store-config-field">
          <span>Publicar con stock</span>
          <select
            className="input"
            value={draft.publishOnStock ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                publishOnStock: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Restringe la publicación automática a ítems con stock.</small>
        </label>

        <label className="store-config-field">
          <span>Auto-publicar webhook</span>
          <select
            className="input"
            value={draft.autoPublishOnWebhook ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                autoPublishOnWebhook: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Publica automáticamente cuando entra un cambio desde webhook.</small>
        </label>

        <label className="store-config-field">
          <span>Estado de auto-publicación</span>
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
          <small>Define si la publicación automática deja el ítem en borrador o activo.</small>
        </label>

        <label className="store-config-field">
          <span>Solo ítems activos</span>
          <select
            className="input"
            value={draft.onlyActiveItems ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                onlyActiveItems: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Evita publicar ítems inactivos cuando corre el flujo automático.</small>
        </label>

        <label className="store-config-field">
          <span>Auto-publicar ajustes</span>
          <select
            className="input"
            value={draft.inventoryAdjustmentsAutoPublish ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                inventoryAdjustmentsAutoPublish: event.target.value === "true",
              }))
            }
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
          <small>Permite publicar automáticamente cuando corren ajustes de inventario.</small>
        </label>
      </div>

      <div className="connection-card-actions">
        <span>
          {activeConfig
            ? "Persistencia por tienda sobre shopify_store_configs."
            : "Esta tienda aún no tiene override persistido; el formulario parte de defaults globales y el primer guardado lo crea."}
        </span>
        <button
          className="btn btn-primary btn-compact"
          type="button"
          disabled={!activeStore || !dirty || saveState === "saving" || Boolean(readiness && !readiness.canSave)}
          onClick={() => void persist()}
        >
          {saveState === "saving" ? "Guardando..." : "Guardar toggles"}
        </button>
      </div>

      {saveMessage ? (
        <p className={`connection-inline-note${saveState === "error" ? " connection-inline-note-error" : ""}`}>
          {saveMessage}
        </p>
      ) : null}
      {!invoiceModeAlreadyActive ? (
        <p className="connection-inline-note">
          Factura como modo directo de Shopify → Alegra sigue activándose desde el legacy hasta portar validaciones de
          resolución, logística y dependencias.
        </p>
      ) : null}
    </section>
  );
}
