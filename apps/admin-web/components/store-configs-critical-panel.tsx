"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { saveStoreConfig } from "../lib/api";

type CriticalStoreConfigDraft = CriticalStoreConfig["rules"] &
  CriticalStoreConfig["invoice"] & {
    shopifyToAlegra: CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"];
    alegraToShopify: CriticalStoreConfig["sync"]["orders"]["alegraToShopify"];
  };

const defaultDraft: CriticalStoreConfigDraft = {
  syncEnabled: true,
  inventoryAdjustmentsEnabled: true,
  generateInvoice: false,
  shopifyToAlegra: "db_only",
  alegraToShopify: "off",
};

function toDraft(config?: CriticalStoreConfig | null): CriticalStoreConfigDraft {
  if (!config) return defaultDraft;
  return {
    syncEnabled: config.rules.syncEnabled,
    inventoryAdjustmentsEnabled: config.rules.inventoryAdjustmentsEnabled,
    generateInvoice: config.invoice.generateInvoice,
    shopifyToAlegra: config.sync.orders.shopifyToAlegra,
    alegraToShopify: config.sync.orders.alegraToShopify,
  };
}

function isDraftEqual(left: CriticalStoreConfigDraft, right: CriticalStoreConfigDraft) {
  return (
    left.syncEnabled === right.syncEnabled &&
    left.inventoryAdjustmentsEnabled === right.inventoryAdjustmentsEnabled &&
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

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? null,
    [activeStoreId, stores]
  );
  const activeConfig = useMemo(
    () => storeConfigs.find((config) => config.storeId === activeStoreId) ?? null,
    [activeStoreId, storeConfigs]
  );

  useEffect(() => {
    setDraft(
      activeConfig
        ? toDraft(activeConfig)
        : {
            syncEnabled: defaults.rules.syncEnabled,
            inventoryAdjustmentsEnabled: defaults.rules.inventoryAdjustmentsEnabled,
            generateInvoice: defaults.invoice.generateInvoice,
            shopifyToAlegra: defaults.sync.orders.shopifyToAlegra,
            alegraToShopify: defaults.sync.orders.alegraToShopify,
          }
    );
    setSaveState("idle");
    setSaveMessage("");
  }, [activeConfig, activeStoreId, defaults]);

  const dirty = useMemo(
    () =>
      !isDraftEqual(
        draft,
        activeConfig
          ? toDraft(activeConfig)
          : {
              syncEnabled: defaults.rules.syncEnabled,
              inventoryAdjustmentsEnabled: defaults.rules.inventoryAdjustmentsEnabled,
              generateInvoice: defaults.invoice.generateInvoice,
              shopifyToAlegra: defaults.sync.orders.shopifyToAlegra,
              alegraToShopify: defaults.sync.orders.alegraToShopify,
            }
      ),
    [activeConfig, defaults, draft]
  );
  const invoiceModeAlreadyActive = activeConfig?.sync.orders.shopifyToAlegra === "invoice";

  async function persist() {
    if (!activeStore) {
      setSaveState("error");
      setSaveMessage("Selecciona una tienda antes de guardar.");
      return;
    }
    setSaveState("saving");
    setSaveMessage("");
    try {
      await saveStoreConfig(String(activeStore.id), {
        storeId: activeStore.id,
        shopDomain: activeConfig?.shopDomain,
        rules: {
          syncEnabled: draft.syncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
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
        rules: {
          syncEnabled: draft.syncEnabled,
          inventoryAdjustmentsEnabled: draft.inventoryAdjustmentsEnabled,
        },
        invoice: {
          generateInvoice: draft.generateInvoice,
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

      <div className="store-configs-grid">
        <label className="store-config-field">
          <span>Sync operativo</span>
          <select
            className="input"
            value={draft.syncEnabled ? "true" : "false"}
            onChange={(event) =>
              setDraft((current) => ({ ...current, syncEnabled: event.target.value === "true" }))
            }
          >
            <option value="true">Activa</option>
            <option value="false">Pausada</option>
          </select>
          <small>Pausa envíos operativos de la tienda; no reemplaza los modos por flujo.</small>
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
      </div>

      <div className="connection-card-actions">
        <span>
          {activeConfig
            ? "Persistencia por tienda sobre shopify_store_configs."
            : "Esta tienda aún no tiene override persistido; el formulario parte de defaults globales y el primer guardado lo crea."}
        </span>
        <button className="btn btn-primary btn-compact" type="button" disabled={!activeStore || !dirty || saveState === "saving"} onClick={() => void persist()}>
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
