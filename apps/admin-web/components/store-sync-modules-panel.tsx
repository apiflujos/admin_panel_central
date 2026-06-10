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
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
  onStoreConfigSaved: (nextConfig: CriticalStoreConfig) => void;
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
    <section className="card connection-card">
      {!activeStore ? (
        <p className="connection-inline-note">Selecciona una tienda para editar sus sincronizaciones.</p>
      ) : null}

      <div className="store-configs-grid">
        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Contactos</strong>
            <span>Match automático entre E-commerce y Contable</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Automático de contactos"
                value={draft.contacts.enabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, enabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Sync automático de contactos."
              />
              <BooleanChoice
                label="E-commerce → Contable"
                value={draft.contacts.fromShopify}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromShopify: next } }))
                }
                positive="Permitido"
                negative="Bloqueado"
                help="Actualiza o crea contactos E-commerce → Contable."
                disabled={!draft.contacts.enabled}
              />
              <BooleanChoice
                label="Crear nuevos en Contable"
                value={draft.contacts.createInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Crea el contacto cuando no hay match."
                disabled={!draft.contacts.enabled || !draft.contacts.fromShopify}
              />
              <BooleanChoice
                label="Contable → E-commerce"
                value={draft.contacts.fromAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromAlegra: next } }))
                }
                positive="Permitido"
                negative="Bloqueado"
                help="Actualiza o crea clientes Contable → E-commerce."
                disabled={!draft.contacts.enabled}
              />
              <BooleanChoice
                label="Crear nuevos en E-commerce"
                value={draft.contacts.createInShopify}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInShopify: next } }))
                }
                positive="Sí"
                negative="No"
                help="Crea el cliente cuando no hay match."
                disabled={!draft.contacts.enabled || !draft.contacts.fromAlegra}
              />
              <label className="store-config-field">
                <span>Prioridad de identificación</span>
                <select
                  className="input"
                  value={draft.contacts.matchPriority.join("_")}
                  disabled={!draft.contacts.enabled}
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
                <small>Orden de match para evitar duplicados antes de crear.</small>
              </label>
            </div>
            <div className="page-module-actions">
              <a className="btn ghost btn-compact" href="/contacts">
                Ejecutar masivo desde contactos
              </a>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Pedidos y facturación</strong>
            <span>Dirección del sync y retorno de facturas</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Pedidos E-commerce → Contable"
                value={draft.orders.shopifyEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, orders: { ...current.orders, shopifyEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Sync de pedidos Shopify → Alegra."
              />
              <label className="store-config-field">
                <span>Modo Shopify → Alegra</span>
                <select
                  className="input"
                  value={draft.orders.shopifyToAlegra}
                  disabled={!draft.orders.shopifyEnabled}
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
                <small>Pedido: registra, crea contacto o factura.</small>
              </label>
              <BooleanChoice
                label="Facturas Contable → E-commerce"
                value={draft.orders.alegraEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, orders: { ...current.orders, alegraEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Sync inverso desde facturas Alegra."
              />
              <label className="store-config-field">
                <span>Modo Alegra → E-commerce</span>
                <select
                  className="input"
                  value={draft.orders.alegraToShopify}
                  disabled={!draft.orders.alegraEnabled}
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
                <small>Facturas vuelven como borrador o activo.</small>
              </label>
            </div>
            <div className="page-module-actions">
              <a className="btn ghost btn-compact" href="/orders">
                Ejecutar pedidos desde orders
              </a>
              <a className="btn ghost btn-compact" href="/invoices">
                Ejecutar facturas desde invoices
              </a>
            </div>
            <div className="settings-subsection">
              <div className="settings-subsection-head">
                <div>
                  <strong>Preparación automática</strong>
                  <span>Confirma si los webhooks y el retorno desde Contable están listos antes de guardar.</span>
                </div>
                {ordersWebhookStatus ? (
                  <span
                    className={`pill ${
                      ordersWebhookStatus.ok ? "pill-ok" : ordersWebhookStatus.connected ? "pill-warn" : "pill-bad"
                    }`}
                  >
                    Shopify{" "}
                    {ordersWebhookStatus.ok ? "listo" : `${ordersWebhookStatus.connected}/${ordersWebhookStatus.total}`}
                  </span>
                ) : (
                  <span className="pill">{ordersWebhookLoading ? "Consultando..." : "Sin datos"}</span>
                )}
              </div>
              <div className="page-module-actions compact-pills">
                {ordersWebhookStatus?.missing?.length ? (
                  <span className="pill pill-warn">Faltan {ordersWebhookStatus.missing.join(", ")}</span>
                ) : (
                  <span className="pill pill-ok">Eventos Shopify completos</span>
                )}
              </div>
              {draft.orders.shopifyEnabled && ordersWebhookStatus && !ordersWebhookStatus.ok ? (
                <p className="connection-inline-note connection-inline-note-error">
                  Sync automático activo pero faltan webhooks. Recréelos antes de usar el flujo en tiempo real.
                </p>
              ) : null}
              {draft.orders.alegraEnabled ? (
                <div className="connection-tech-list">
                  <div className="connection-tech-item">
                    <span>Webhook esperado en Contable</span>
                    <strong>{alegraWebhookUrl || "Conecta Shopify para construir la URL."}</strong>
                  </div>
                  <div className="connection-tech-item">
                    <span>Eventos a escuchar</span>
                    <strong>invoice.created e invoice.updated.</strong>
                  </div>
                </div>
              ) : null}
              {ordersWebhookMessage ? <p className="connection-inline-note">{ordersWebhookMessage}</p> : null}
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Productos E-commerce → Contable</strong>
            <span>Crear, actualizar, inventario y match Shopify → Alegra</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Automático Shopify → Contable"
                value={draft.products.shopifyEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, shopifyEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Sync automático Shopify → Contable."
              />
              <BooleanChoice
                label="Crear en Contable"
                value={draft.products.createInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, createInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Crea el producto cuando no existe."
                disabled={!draft.products.shopifyEnabled}
              />
              <BooleanChoice
                label="Actualizar en Contable"
                value={draft.products.updateInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, updateInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Refresca productos existentes en Contable."
                disabled={!draft.products.shopifyEnabled}
              />
              <BooleanChoice
                label="Incluir inventario"
                value={draft.products.includeInventory}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, includeInventory: next } }))
                }
                positive="Sí"
                negative="No"
                help="Incluye stock en el sync."
                disabled={!draft.products.shopifyEnabled}
              />
              <label className="store-config-field">
                <span>Prioridad de match</span>
                <select
                  className="input"
                  value={draft.products.matchPriority}
                  disabled={!draft.products.shopifyEnabled}
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
                <small>Define el primer criterio de match antes de crear un item nuevo.</small>
              </label>
              <label className="store-config-field">
                <span>Bodega destino en Contable</span>
                <input
                  className="input"
                  value={draft.products.warehouseId}
                  disabled={!draft.products.shopifyEnabled || !draft.products.includeInventory}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      products: { ...current.products, warehouseId: event.target.value },
                    }))
                  }
                  placeholder="ID de bodega"
                />
                <small>Aplica cuando el sync E-commerce → Contable mueve existencias.</small>
              </label>
            </div>
            <div className="page-module-actions">
              <a className="btn ghost btn-compact" href="/products">
                Ejecutar masivo desde products
              </a>
            </div>
          </div>
        </details>
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
