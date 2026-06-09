"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { getShopifyWebhookStatus, saveStoreConfig } from "../lib/api";
import { BooleanChoice } from "./ui/boolean-choice";

type SyncDraft = CriticalStoreConfig["sync"];
type ShopifyWebhookStatus = {
  ok: boolean;
  total: number;
  connected: number;
  missing: string[];
  callbackUrl?: string;
};

function cloneSyncDraft(sync: SyncDraft): SyncDraft {
  return {
    contacts: {
      enabled: sync.contacts.enabled,
      fromShopify: sync.contacts.fromShopify,
      fromAlegra: sync.contacts.fromAlegra,
      createInAlegra: sync.contacts.createInAlegra,
      createInShopify: sync.contacts.createInShopify,
      matchPriority: [...sync.contacts.matchPriority],
    },
    orders: {
      shopifyEnabled: sync.orders.shopifyEnabled,
      alegraEnabled: sync.orders.alegraEnabled,
      shopifyToAlegra: sync.orders.shopifyToAlegra,
      alegraToShopify: sync.orders.alegraToShopify,
    },
    products: {
      shopifyEnabled: sync.products.shopifyEnabled,
      createInAlegra: sync.products.createInAlegra,
      updateInAlegra: sync.products.updateInAlegra,
      includeInventory: sync.products.includeInventory,
      warehouseId: sync.products.warehouseId,
      matchPriority: sync.products.matchPriority,
    },
  };
}

function isSyncEqual(left: SyncDraft, right: SyncDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function StoreSyncModulesPanel({
  stores,
  storeConfigs,
  defaults,
  activeStoreId,
  onStoreConfigSaved,
  visibleModules = ["contacts", "orders", "products"],
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
  onStoreConfigSaved: (nextConfig: CriticalStoreConfig) => void;
  visibleModules?: Array<"contacts" | "orders" | "products">;
}) {
  const [draft, setDraft] = useState<SyncDraft>(cloneSyncDraft(defaults.sync));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [ordersWebhookStatus, setOrdersWebhookStatus] = useState<ShopifyWebhookStatus | null>(null);
  const [ordersWebhookLoading, setOrdersWebhookLoading] = useState(false);
  const [ordersWebhookMessage, setOrdersWebhookMessage] = useState("");

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? null,
    [activeStoreId, stores]
  );
  const activeConfig = useMemo(
    () => storeConfigs.find((config) => config.storeId === activeStoreId) ?? null,
    [activeStoreId, storeConfigs]
  );
  const commerceLabel = activeStore?.providers.shopify
    ? "Shopify"
    : activeStore?.providers.woocommerce
      ? "WooCommerce"
      : "Tienda";
  const accountingLabel = activeStore?.providers.alegra ? "Alegra" : "Contable";
  const hasCommerceProvider = Boolean(activeStore?.providers.shopify || activeStore?.providers.woocommerce);
  const hasAccountingProvider = Boolean(activeStore?.providers.alegra);
  const pairConnected = hasCommerceProvider && hasAccountingProvider;

  const baseSync = activeConfig?.sync ?? defaults.sync;

  useEffect(() => {
    setDraft(cloneSyncDraft(baseSync));
    setSaveState("idle");
    setSaveMessage("");
  }, [baseSync]);

  useEffect(() => {
    const shopDomain = activeStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setOrdersWebhookStatus(null);
      setOrdersWebhookMessage("");
      return;
    }
    let cancelled = false;
    setOrdersWebhookLoading(true);
    setOrdersWebhookMessage("");
    getShopifyWebhookStatus(shopDomain)
      .then((payload) => {
        if (!cancelled) {
          setOrdersWebhookStatus(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOrdersWebhookStatus(null);
          setOrdersWebhookMessage(
            error instanceof Error ? error.message : "No se pudo consultar el estado de webhooks."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrdersWebhookLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeStore?.providers.shopify?.shopDomain]);

  const dirty = useMemo(() => !isSyncEqual(draft, baseSync), [draft, baseSync]);
  const alegraWebhookUrl = useMemo(() => {
    const shopDomain = activeStore?.providers.shopify?.shopDomain;
    if (!shopDomain) return "";
    if (typeof window === "undefined") return `/api/webhooks/alegra?shopDomain=${encodeURIComponent(shopDomain)}`;
    return `${window.location.origin}/api/webhooks/alegra?shopDomain=${encodeURIComponent(shopDomain)}`;
  }, [activeStore?.providers.shopify?.shopDomain]);

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
        shopDomain: activeConfig?.shopDomain ?? activeStore.providers.shopify?.shopDomain,
        priceLists: activeConfig?.priceLists ?? defaults.priceLists,
        transfers: activeConfig?.transfers ?? defaults.transfers,
        rules: activeConfig?.rules ?? defaults.rules,
        invoice: activeConfig?.invoice ?? defaults.invoice,
        sync: draft,
      });
      onStoreConfigSaved({
        ...(activeConfig ?? {
          storeId: activeStore.id,
          storeName: activeStore.name,
          shopDomain: activeStore.providers.shopify?.shopDomain,
          priceLists: defaults.priceLists,
          transfers: defaults.transfers,
          rules: defaults.rules,
          invoice: defaults.invoice,
          sync: defaults.sync,
        }),
        sync: cloneSyncDraft(draft),
      });
      setSaveState("saved");
      setSaveMessage("Sincronizaciones por tienda guardadas.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración de sync.");
    }
  }

  return (
    <section className="card connection-card settings-density-compact">
      <div className="connection-card-head">
        <div>
          <h3>Automático por módulo</h3>
          <p>Solo define lo que corre solo.</p>
        </div>
        {activeStore ? <span className="pill">Tienda #{activeStore.id}</span> : null}
      </div>

      {!activeStore ? (
        <p className="connection-inline-note">Selecciona una tienda para editar sus sincronizaciones.</p>
      ) : null}

      <div className="store-configs-grid">
        {visibleModules.includes("contacts") ? (
          <details className="settings-collapsible store-config-field-span-2" open>
            <summary className="settings-collapsible-summary">
              <strong>Contactos</strong>
              <span>Dirección y match</span>
            </summary>
            <div className="settings-subsection">
              {!pairConnected ? (
                <p className="connection-inline-note connection-inline-note-error">
                  Para activar este módulo necesitas conectar {commerceLabel} y {accountingLabel} en la tienda.
                </p>
              ) : (
                <p className="connection-inline-note">
                  Listo para automático entre {commerceLabel} y {accountingLabel}.
                </p>
              )}
              <div className="store-configs-grid">
                <BooleanChoice
                  label="Activo"
                  value={draft.contacts.enabled}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, contacts: { ...current.contacts, enabled: next } }))
                  }
                  positive="Activo"
                  negative="Pausado"
                  help="Controla si la sincronización de contactos queda habilitada en segundo plano."
                />
                <BooleanChoice
                  label={`${commerceLabel} → ${accountingLabel}`}
                  value={draft.contacts.fromShopify}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromShopify: next } }))
                  }
                  positive="Permitido"
                  negative="Bloqueado"
                  help={`Permite actualizar o crear contactos desde ${commerceLabel} hacia ${accountingLabel}.`}
                  disabled={!draft.contacts.enabled || !hasCommerceProvider}
                />
                <BooleanChoice
                  label={`Crear en ${accountingLabel}`}
                  value={draft.contacts.createInAlegra}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInAlegra: next } }))
                  }
                  positive="Sí"
                  negative="No"
                  help={`Cuando no existe match, decide si se crea el contacto en ${accountingLabel}.`}
                  disabled={!draft.contacts.enabled || !draft.contacts.fromShopify || !hasAccountingProvider}
                />
                <BooleanChoice
                  label={`${accountingLabel} → ${commerceLabel}`}
                  value={draft.contacts.fromAlegra}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromAlegra: next } }))
                  }
                  positive="Permitido"
                  negative="Bloqueado"
                  help={`Permite actualizar o crear clientes desde ${accountingLabel} hacia ${commerceLabel}.`}
                  disabled={!draft.contacts.enabled || !hasAccountingProvider}
                />
                <BooleanChoice
                  label={`Crear en ${commerceLabel}`}
                  value={draft.contacts.createInShopify}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInShopify: next } }))
                  }
                  positive="Sí"
                  negative="No"
                  help={`Cuando no existe match, decide si se crea el cliente en ${commerceLabel}.`}
                  disabled={!draft.contacts.enabled || !draft.contacts.fromAlegra || !hasCommerceProvider}
                />
                <label className="store-config-field">
                  <span>Prioridad</span>
                  <select
                    className="input"
                    value={draft.contacts.matchPriority.join("_")}
                    disabled={!draft.contacts.enabled || !pairConnected}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contacts: { ...current.contacts, matchPriority: event.target.value.split("_").filter(Boolean) },
                      }))
                    }
                  >
                    <option value="document_phone_email">Documento → Teléfono → Email</option>
                    <option value="email_document_phone">Email → Documento → Teléfono</option>
                    <option value="phone_document_email">Teléfono → Documento → Email</option>
                  </select>
                </label>
              </div>
              <div className="page-module-actions">
                <a className="btn ghost btn-compact" href="/contacts">
                  Ir a contactos
                </a>
              </div>
              <div className="settings-subsection settings-inline-summary">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Resumen</strong>
                    <span>Automático</span>
                  </div>
                  <span className={`pill ${draft.contacts.enabled ? "pill-ok" : "pill-warn"}`}>
                    {draft.contacts.enabled ? "Automático activo" : "Automático pausado"}
                  </span>
                </div>
                <div className="page-module-actions compact-pills">
                  <span className={`pill ${draft.contacts.fromShopify ? "pill-ok" : ""}`}>
                    {commerceLabel} → {accountingLabel}
                  </span>
                  <span className={`pill ${draft.contacts.fromAlegra ? "pill-ok" : ""}`}>
                    {accountingLabel} → {commerceLabel}
                  </span>
                  <span className="pill">Prioridad {draft.contacts.matchPriority.join(" / ")}</span>
                </div>
              </div>
            </div>
          </details>
        ) : null}

        {visibleModules.includes("orders") ? (
          <details className="settings-collapsible store-config-field-span-2" open>
            <summary className="settings-collapsible-summary">
              <strong>Pedidos</strong>
              <span>Entrada y vuelta</span>
            </summary>
            <div className="settings-subsection">
              {!pairConnected ? (
                <p className="connection-inline-note connection-inline-note-error">
                  Para activar este módulo necesitas conectar {commerceLabel} y {accountingLabel} en la tienda.
                </p>
              ) : (
                <p className="connection-inline-note">
                  Listo para pedidos entre {commerceLabel} y {accountingLabel}.
                </p>
              )}
              <div className="store-configs-grid">
                <BooleanChoice
                  label={`${commerceLabel} activo`}
                  value={draft.orders.shopifyEnabled}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, orders: { ...current.orders, shopifyEnabled: next } }))
                  }
                  positive="Activo"
                  negative="Pausado"
                  help={`Habilita el flujo principal de pedidos desde ${commerceLabel} hacia ${accountingLabel}.`}
                  disabled={!pairConnected}
                />
                <label className="store-config-field">
                  <span>Qué hace al entrar</span>
                  <select
                    className="input"
                    value={draft.orders.shopifyToAlegra}
                    disabled={!draft.orders.shopifyEnabled || !pairConnected}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        orders: {
                          ...current.orders,
                          shopifyToAlegra: event.target.value as SyncDraft["orders"]["shopifyToAlegra"],
                        },
                      }))
                    }
                  >
                    <option value="db_only">Solo base de datos</option>
                    <option value="contact_only">Solo contacto</option>
                    <option value="invoice">Factura</option>
                    <option value="off">Apagado</option>
                  </select>
                </label>
                <BooleanChoice
                  label={`${accountingLabel} activo`}
                  value={draft.orders.alegraEnabled}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, orders: { ...current.orders, alegraEnabled: next } }))
                  }
                  positive="Activo"
                  negative="Pausado"
                  help={`Controla si el flujo inverso desde facturas de ${accountingLabel} queda disponible.`}
                  disabled={!pairConnected}
                />
                <label className="store-config-field">
                  <span>Qué hace al volver</span>
                  <select
                    className="input"
                    value={draft.orders.alegraToShopify}
                    disabled={!draft.orders.alegraEnabled || !pairConnected}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        orders: {
                          ...current.orders,
                          alegraToShopify: event.target.value as SyncDraft["orders"]["alegraToShopify"],
                        },
                      }))
                    }
                  >
                    <option value="off">Apagado</option>
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                  </select>
                </label>
              </div>
              <div className="page-module-actions">
                <a className="btn ghost btn-compact" href="/orders">
                  Ir a pedidos
                </a>
                <a className="btn ghost btn-compact" href="/invoices">
                  Ir a facturas
                </a>
              </div>
              <div className="settings-subsection settings-inline-summary">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Resumen</strong>
                    <span>Automático</span>
                  </div>
                  {ordersWebhookStatus ? (
                    <span
                      className={`pill ${
                        ordersWebhookStatus.ok ? "pill-ok" : ordersWebhookStatus.connected ? "pill-warn" : "pill-bad"
                      }`}
                    >
                    {commerceLabel}{" "}
                      {ordersWebhookStatus.ok
                        ? "listo"
                        : `${ordersWebhookStatus.connected}/${ordersWebhookStatus.total}`}
                    </span>
                  ) : (
                    <span className="pill">{ordersWebhookLoading ? "Consultando..." : "Sin datos"}</span>
                  )}
                </div>
                <div className="page-module-actions compact-pills">
                  <span className={`pill ${draft.orders.shopifyEnabled ? "pill-ok" : ""}`}>
                    Automático pedidos {draft.orders.shopifyEnabled ? "activo" : "pausado"}
                  </span>
                  <span className={`pill ${draft.orders.alegraEnabled ? "pill-ok" : ""}`}>
                    Automático facturas {draft.orders.alegraEnabled ? "activo" : "pausado"}
                  </span>
                  {ordersWebhookStatus?.missing?.length ? (
                    <span className="pill pill-warn">Faltan {ordersWebhookStatus.missing.join(", ")}</span>
                  ) : (
                    <span className="pill pill-ok">Eventos Shopify completos</span>
                  )}
                </div>
                {draft.orders.shopifyEnabled && ordersWebhookStatus && !ordersWebhookStatus.ok ? (
                  <p className="connection-inline-note connection-inline-note-error">
                    {commerceLabel} automático está activo, pero faltan webhooks. Recréelos desde el bloque operativo
                    de Pedidos antes de depender del flujo en tiempo real.
                  </p>
                ) : null}
                {draft.orders.alegraEnabled ? (
                  <div className="connection-tech-list">
                    <div className="connection-tech-item">
                      <span>Webhook esperado en {accountingLabel}</span>
                      <strong>{alegraWebhookUrl || "Selecciona una tienda con Shopify para construir la URL."}</strong>
                    </div>
                    <div className="connection-tech-item">
                      <span>Eventos a escuchar</span>
                      <strong>invoice.created e invoice.updated sobre la tienda activa.</strong>
                    </div>
                  </div>
                ) : null}
                {ordersWebhookMessage ? <p className="connection-inline-note">{ordersWebhookMessage}</p> : null}
              </div>
            </div>
          </details>
        ) : null}

        {visibleModules.includes("products") ? (
          <details className="settings-collapsible store-config-field-span-2" open>
            <summary className="settings-collapsible-summary">
              <strong>Productos</strong>
              <span>Catálogo y stock</span>
            </summary>
            <div className="settings-subsection">
              {!pairConnected ? (
                <p className="connection-inline-note connection-inline-note-error">
                  Para activar este módulo necesitas conectar {commerceLabel} y {accountingLabel} en la tienda.
                </p>
              ) : (
                <p className="connection-inline-note">
                  Listo para catálogo entre {commerceLabel} y {accountingLabel}.
                </p>
              )}
              <div className="store-configs-grid">
                <BooleanChoice
                  label="Activo"
                  value={draft.products.shopifyEnabled}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, products: { ...current.products, shopifyEnabled: next } }))
                  }
                  positive="Activo"
                  negative="Pausado"
                  help={`Habilita la sincronización automática desde ${commerceLabel} hacia ${accountingLabel}.`}
                  disabled={!pairConnected}
                />
                <BooleanChoice
                  label={`Crear en ${accountingLabel}`}
                  value={draft.products.createInAlegra}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, products: { ...current.products, createInAlegra: next } }))
                  }
                  positive="Sí"
                  negative="No"
                  help={`Si no existe el producto en ${accountingLabel}, permite crearlo automáticamente.`}
                  disabled={!draft.products.shopifyEnabled || !pairConnected}
                />
                <BooleanChoice
                  label={`Actualizar en ${accountingLabel}`}
                  value={draft.products.updateInAlegra}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, products: { ...current.products, updateInAlegra: next } }))
                  }
                  positive="Sí"
                  negative="No"
                  help={`Permite refrescar información de productos existentes en ${accountingLabel}.`}
                  disabled={!draft.products.shopifyEnabled || !pairConnected}
                />
                <BooleanChoice
                  label="Incluir inventario"
                  value={draft.products.includeInventory}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, products: { ...current.products, includeInventory: next } }))
                  }
                  positive="Sí"
                  negative="No"
                  help="Incluye ajustes de stock al sincronizar productos desde Shopify."
                  disabled={!draft.products.shopifyEnabled || !pairConnected}
                />
                <label className="store-config-field">
                  <span>Match</span>
                  <select
                    className="input"
                    value={draft.products.matchPriority}
                    disabled={!draft.products.shopifyEnabled || !pairConnected}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        products: {
                          ...current.products,
                          matchPriority: event.target.value as SyncDraft["products"]["matchPriority"],
                        },
                      }))
                    }
                  >
                    <option value="sku_barcode">SKU → Barcode</option>
                    <option value="barcode_sku">Barcode → SKU</option>
                  </select>
                </label>
                <label className="store-config-field">
                  <span>Bodega en {accountingLabel}</span>
                  <input
                    className="input"
                    value={draft.products.warehouseId}
                    disabled={!draft.products.shopifyEnabled || !draft.products.includeInventory || !hasAccountingProvider}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        products: { ...current.products, warehouseId: event.target.value },
                      }))
                    }
                    placeholder="ID de bodega"
                  />
                </label>
              </div>
              <div className="page-module-actions">
                <a className="btn ghost btn-compact" href="/products">
                  Ir a productos
                </a>
              </div>
              <div className="settings-subsection settings-inline-summary">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Resumen</strong>
                    <span>Automático</span>
                  </div>
                  <span className={`pill ${draft.products.shopifyEnabled ? "pill-ok" : "pill-warn"}`}>
                    {draft.products.shopifyEnabled ? "Automático activo" : "Automático pausado"}
                  </span>
                </div>
                <div className="page-module-actions compact-pills">
                  <span className={`pill ${draft.products.createInAlegra ? "pill-ok" : ""}`}>
                    Crear en {accountingLabel}
                  </span>
                  <span className={`pill ${draft.products.updateInAlegra ? "pill-ok" : ""}`}>
                    Actualizar en {accountingLabel}
                  </span>
                  <span className={`pill ${draft.products.includeInventory ? "pill-ok" : ""}`}>Mover inventario</span>
                  <span className="pill">
                    Match {draft.products.matchPriority === "barcode_sku" ? "Barcode → SKU" : "SKU → Barcode"}
                  </span>
                </div>
              </div>
            </div>
          </details>
        ) : null}
      </div>

      <div className="connection-card-actions">
        <button
          className="btn primary"
          type="button"
          disabled={!activeStore || !dirty || saveState === "saving"}
          onClick={() => void persist()}
        >
          {saveState === "saving" ? "Guardando..." : "Guardar sincronizaciones"}
        </button>
        {saveMessage ? <span>{saveMessage}</span> : null}
      </div>
    </section>
  );
}
