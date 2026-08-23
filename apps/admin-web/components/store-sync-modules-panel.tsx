"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { getShopifyWebhookStatus, saveStoreConfig } from "../lib/api";
import { BooleanChoice } from "./ui/boolean-choice";
import { StoreConfigCoherencia } from "./store-config-coherencia";
import type { ConfiguracionParaRevisar } from "../../../packages/shared/src/config-coherencia";

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

  // Revisión de coherencia sobre lo que el usuario está viendo AHORA (el
  // borrador), no sobre lo guardado: así el aviso aparece en el momento en que
  // crea la contradicción, antes de guardarla.
  const revision = useMemo<ConfiguracionParaRevisar>(
    () => ({
      tieneCuentaAlegra: Boolean(activeConfig?.alegraAccountId),
      facturaPedidos: draft.orders.shopifyToAlegra === "invoice",
      creaClienteEnAlegra: Boolean(draft.contacts.createInAlegra),
      clientesDeLaTiendaAAlegra: Boolean(draft.contacts.fromShopify),
      mandaAlegraEnInventario: (activeConfig?.sourceOfTruth?.inventory ?? "alegra") === "alegra",
      enviaExistenciasHaciaAlegra: Boolean(draft.products.includeInventory),
      escribeEnLaTienda: Boolean(activeConfig?.rules?.updateInShopify || activeConfig?.rules?.createInShopify),
    }),
    [activeConfig, draft]
  );

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

      {activeStore ? <StoreConfigCoherencia config={revision} /> : null}

      <div className="store-configs-grid">
        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Contactos</strong>
            <span>Cómo se emparejan los clientes de la tienda con los de Alegra</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Sincronizar clientes sin intervención"
                value={draft.contacts.enabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, enabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Cuando entra un pedido o cambia una ficha, el otro sistema se actualiza solo."
              />
              <BooleanChoice
                label="El cliente del pedido pasa a Alegra"
                value={draft.contacts.fromShopify}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromShopify: next } }))
                }
                positive="Permitido"
                negative="Bloqueado"
                help="Quien compra en la tienda se crea o se actualiza en Alegra. Es lo que permite facturarle."
                disabled={!draft.contacts.enabled}
              />
              <BooleanChoice
                label="Dar de alta al cliente nuevo en Alegra"
                value={draft.contacts.createInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Si el comprador no existe en Alegra, se crea. Sin esto, un cliente nuevo no se puede facturar."
                disabled={!draft.contacts.enabled || !draft.contacts.fromShopify}
              />
              <BooleanChoice
                label="El cliente de Alegra pasa a la tienda"
                value={draft.contacts.fromAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, fromAlegra: next } }))
                }
                positive="Permitido"
                negative="Bloqueado"
                help="Un cliente dado de alta en Alegra aparece también en la tienda."
                disabled={!draft.contacts.enabled}
              />
              <BooleanChoice
                label="Dar de alta al cliente nuevo en la tienda"
                value={draft.contacts.createInShopify}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, contacts: { ...current.contacts, createInShopify: next } }))
                }
                positive="Sí"
                negative="No"
                help="Si el cliente de Alegra no existe en la tienda, se crea."
                disabled={!draft.contacts.enabled || !draft.contacts.fromAlegra}
              />
              <label className="store-config-field">
                <span>Con qué dato se reconoce a un cliente</span>
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
                <small>
                  Se busca por el primero; si no aparece, por el siguiente. Evita crear el mismo cliente dos veces.
                </small>
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
            <span>Qué se lleva a Alegra y qué vuelve de allí</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Llevar los pedidos a Alegra"
                value={draft.orders.shopifyEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, orders: { ...current.orders, shopifyEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Cada pedido de la tienda se registra en Alegra."
              />
              <label className="store-config-field">
                <span>Qué se hace con el pedido</span>
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
                <small>Qué hacer con cada pedido: sólo guardarlo, guardarlo con su cliente, o emitir la factura.</small>
              </label>
              <BooleanChoice
                label="Traer a la tienda las facturas de Alegra"
                value={draft.orders.alegraEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, orders: { ...current.orders, alegraEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Una factura hecha en Alegra crea su pedido correspondiente en la tienda."
              />
              <label className="store-config-field">
                <span>Cómo llega el pedido a la tienda</span>
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
                <small>Si el pedido que se crea en la tienda nace como borrador o ya publicado.</small>
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
                  <span>Confirma si los webhooks y el retorno desde Alegra están listos antes de guardar.</span>
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
                    <span>Webhook esperado en Alegra</span>
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
            <strong>Productos Shopify → Alegra</strong>
            <span>Qué se crea y qué se actualiza en Alegra a partir de la tienda</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <BooleanChoice
                label="Llevar productos de la tienda a Alegra"
                value={draft.products.shopifyEnabled}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, shopifyEnabled: next } }))
                }
                positive="Activo"
                negative="Inactivo"
                help="Los productos que se creen o cambien en la tienda se reflejan en Alegra."
              />
              <BooleanChoice
                label="Dar de alta el producto en Alegra"
                value={draft.products.createInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, createInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Si el producto de la tienda no existe en Alegra, se crea."
                disabled={!draft.products.shopifyEnabled}
              />
              <BooleanChoice
                label="Actualizar los que ya existen"
                value={draft.products.updateInAlegra}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, updateInAlegra: next } }))
                }
                positive="Sí"
                negative="No"
                help="Refresca en Alegra los datos de los productos que ya están allí."
                disabled={!draft.products.shopifyEnabled}
              />
              <BooleanChoice
                label="Incluir también las existencias"
                value={draft.products.includeInventory}
                onChange={(next) =>
                  setDraft((current) => ({ ...current, products: { ...current.products, includeInventory: next } }))
                }
                positive="Sí"
                negative="No"
                help="Envía además las cantidades. Déjalo APAGADO si Alegra manda sobre el inventario: si no, la tienda le sobrescribiría el stock."
                disabled={!draft.products.shopifyEnabled}
              />
              <label className="store-config-field">
                <span>Con qué dato se reconoce un producto</span>
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
                <small>Se busca por ese dato antes de dar de alta uno nuevo. Evita duplicar productos.</small>
              </label>
              <label className="store-config-field">
                <span>Bodega de Alegra donde se descuenta</span>
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
                <small>Sólo se usa si las existencias viajan de la tienda hacia Alegra.</small>
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
