"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionStatusDto, SettingsOverviewDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

type ConnectionRow = ConnectionStatusDto & { id: string };

type WorkspaceStore = {
  id: number;
  name: string;
  createdAt: string;
  providers: {
    shopify: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
      shopDomain?: string;
    } | null;
    alegra: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
    } | null;
    woocommerce: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
      shopDomain?: string;
    } | null;
  };
};

type WorkspaceAds = {
  key: string;
  label: string;
  status: ConnectionStatusDto["status"];
  detail: string;
};

type ConnectionsWorkspace = {
  companyName: string;
  securityMisconfigured: boolean;
  stores: WorkspaceStore[];
  ads: WorkspaceAds[];
};

type WebhookStatus = {
  ok: boolean;
  total: number;
  connected: number;
  missing: string[];
  callbackUrl?: string;
};

export function SettingsConnectionsPage({
  overview,
  connections,
  summary,
  workspace,
}: {
  overview: SettingsOverviewDto;
  connections: ConnectionRow[];
  summary: {
    total: number;
    connectedCount: number;
    attentionCount: number;
    disconnectedCount: number;
  };
  workspace: ConnectionsWorkspace;
}) {
  const [selected, setSelected] = useState<ConnectionRow | null>(null);
  const [workspaceState, setWorkspaceState] = useState<ConnectionsWorkspace>(workspace);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string>("");

  useEffect(() => {
    setWorkspaceState(workspace);
    setSelectedStoreId((current) => current ?? workspace.stores[0]?.id ?? null);
  }, [workspace]);

  const selectedStore = useMemo(
    () => workspaceState.stores.find((store) => store.id === selectedStoreId) ?? workspaceState.stores[0] ?? null,
    [selectedStoreId, workspaceState.stores]
  );

  const commerceRows = workspaceState.stores.flatMap((store) =>
    [
      store.providers.shopify
        ? {
            key: `shopify:${store.id}`,
            provider: "Shopify",
            storeName: store.name,
            label: store.providers.shopify.label,
            status: store.providers.shopify.status,
            detail: store.providers.shopify.detail,
            secondary: store.providers.shopify.shopDomain || "",
          }
        : null,
      store.providers.woocommerce
        ? {
            key: `woocommerce:${store.id}`,
            provider: "WooCommerce",
            storeName: store.name,
            label: store.providers.woocommerce.label,
            status: store.providers.woocommerce.status,
            detail: store.providers.woocommerce.detail,
            secondary: store.providers.woocommerce.shopDomain || "",
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string;
      provider: string;
      storeName: string;
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
      secondary: string;
      storeId: number;
    }>
  );
  const accountingRows = workspaceState.stores
    .filter((store) => store.providers.alegra)
    .map((store) => ({
      key: `alegra:${store.id}`,
      provider: "Alegra",
      storeName: store.name,
      label: store.providers.alegra?.label || "",
      status: store.providers.alegra?.status || "disconnected",
      detail: store.providers.alegra?.detail || "Sin configurar",
      storeId: store.id,
    }));
  const selectedCommerceRows = selectedStore ? commerceRows.filter((row) => row.storeId === selectedStore.id) : commerceRows;
  const selectedAccountingRows = selectedStore
    ? accountingRows.filter((row) => row.storeId === selectedStore.id)
    : accountingRows;

  async function refreshWorkspace() {
    const response = await fetch("/api/admin-web/connections/workspace", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`workspace_refresh_failed:${response.status}`);
    }
    const next = (await response.json()) as ConnectionsWorkspace;
    setWorkspaceState(next);
    setSelectedStoreId((current) => {
      if (!current) return next.stores[0]?.id ?? null;
      return next.stores.some((store) => store.id === current) ? current : next.stores[0]?.id ?? null;
    });
    return next;
  }

  async function loadWebhookStatus(shopDomain: string) {
    setWebhookLoading(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/shopify/webhooks/status?shopDomain=${encodeURIComponent(shopDomain)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as WebhookStatus | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || `webhook_status_failed:${response.status}`);
      }
      setWebhookStatus(payload as WebhookStatus);
    } catch (error) {
      setWebhookStatus(null);
      setStatusMessage(error instanceof Error ? error.message : "No se pudo consultar webhooks.");
    } finally {
      setWebhookLoading(false);
    }
  }

  useEffect(() => {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setWebhookStatus(null);
      return;
    }
    void loadWebhookStatus(shopDomain);
  }, [selectedStore?.id, selectedStore?.providers.shopify?.shopDomain]);

  async function runWebhookAction(action: "create" | "delete") {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setStatusMessage("Selecciona una tienda con Shopify conectado.");
      return;
    }
    setActionLoadingKey(`webhooks:${action}`);
    setStatusMessage("");
    try {
      const response = await fetch(action === "create" ? "/api/shopify/webhooks" : "/api/shopify/webhooks/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain }),
      });
      const payload = (await response.json()) as { error?: string; deleted?: number; total?: number; ok?: boolean };
      if (!response.ok) {
        throw new Error(payload.error || `webhook_${action}_failed:${response.status}`);
      }
      setStatusMessage(
        action === "create"
          ? "Webhooks creados o actualizados."
          : `Webhooks eliminados ${payload.deleted ?? 0}/${payload.total ?? 0}.`
      );
      await Promise.all([refreshWorkspace(), loadWebhookStatus(shopDomain)]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `No se pudo ${action === "create" ? "crear" : "eliminar"} webhooks.`);
    } finally {
      setActionLoadingKey("");
    }
  }

  async function disconnectProvider(provider: "shopify" | "woocommerce" | "alegra", storeId: number, shopDomain?: string) {
    const confirmed = window.confirm(`Confirma desconectar ${provider} de esta tienda.`);
    if (!confirmed) return;
    setActionLoadingKey(`disconnect:${provider}:${storeId}`);
    setStatusMessage("");
    try {
      let path = "";
      if (provider === "shopify") {
        if (!shopDomain) throw new Error("Dominio Shopify faltante.");
        path = `/api/connections/domain/${encodeURIComponent(shopDomain)}`;
      } else if (provider === "woocommerce") {
        if (!shopDomain) throw new Error("Dominio WooCommerce faltante.");
        path = `/api/woocommerce/connections/${encodeURIComponent(shopDomain)}`;
      } else {
        path = `/api/connections/alegra/${storeId}`;
      }
      const response = await fetch(path, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `disconnect_failed:${response.status}`);
      }
      setStatusMessage(`${provider} desconectado correctamente.`);
      const nextWorkspace = await refreshWorkspace();
      if (provider === "shopify" && selectedStoreId && !nextWorkspace.stores.find((store) => store.id === selectedStoreId)?.providers.shopify) {
        setWebhookStatus(null);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo desconectar.");
    } finally {
      setActionLoadingKey("");
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Configuración"
        subtitle="Canales y credenciales del tenant."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Configuración</span>
          </>
        }
      />

      <PageToolbar
        filters={
          <>
            <span className="pill pill-info">Total · {summary.total}</span>
            <span className="pill pill-success">Activas · {summary.connectedCount}</span>
            <span className="pill pill-warning">Atencion · {summary.attentionCount}</span>
            <span className="pill pill-error">Desconectadas · {summary.disconnectedCount}</span>
          </>
        }
      />

      <section className="stats-grid stats-grid-tight">
        <article className="card stat-card">
          <p className="stat-label">Cliente</p>
          <strong>{workspaceState.companyName}</strong>
          <span className="stat-note">Tenant activo</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Conexiones activas</p>
          <strong>{overview.activeConnections}</strong>
          <span className="stat-note">{overview.moduleCount} modulos</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Pendientes</p>
          <strong>{overview.pendingActions}</strong>
          <span className="stat-note">Requieren revision</span>
        </article>
      </section>

      {workspaceState.securityMisconfigured ? (
        <article className="card stat-card">
          <p className="stat-label">Seguridad</p>
          <strong>CRYPTO_KEY_BASE64 inestable</strong>
          <span className="stat-note">Hay credenciales guardadas que requieren reconexión.</span>
        </article>
      ) : null}

      <section className="card connection-card">
        <div className="connection-card-head">
          <div>
            <h3>Tienda activa</h3>
            <p>Contexto de lectura y acciones operativas para la fase inicial de portado.</p>
          </div>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              void refreshWorkspace();
            }}
          >
            Refrescar
          </button>
        </div>
        <div className="connection-card-actions">
          <select
            className="input"
            value={selectedStore?.id ?? ""}
            onChange={(event) => setSelectedStoreId(Number(event.target.value || ""))}
          >
            {workspaceState.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          {selectedStore ? <span className="pill">Store #{selectedStore.id}</span> : null}
        </div>
        {statusMessage ? <p className="connection-inline-note">{statusMessage}</p> : null}
      </section>

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>Tiendas conectadas</strong>
            <span>Vista de lectura real por tienda antes del portado mutativo.</span>
          </div>
        </div>
        <section className="connections-grid">
          {workspaceState.stores.length ? (
            workspaceState.stores.map((store) => {
              const connectedProviders = [
                store.providers.shopify ? "Shopify" : null,
                store.providers.alegra ? "Alegra" : null,
                store.providers.woocommerce ? "WooCommerce" : null,
              ].filter(Boolean);
              return (
                <article className="card connection-card" key={`store:${store.id}`}>
                  <div className="connection-card-head">
                    <div>
                      <h3>{store.name}</h3>
                      <p>{connectedProviders.length ? connectedProviders.join(" · ") : "Sin proveedores configurados"}</p>
                    </div>
                    <span className="pill">{connectedProviders.length || 0} providers</span>
                  </div>
                  <div className="connection-card-meta">
                    {store.providers.shopify ? <span className="pill pill-info">Shopify</span> : null}
                    {store.providers.alegra ? <span className="pill pill-success">Alegra</span> : null}
                    {store.providers.woocommerce ? <span className="pill pill-warning">WooCommerce</span> : null}
                  </div>
                </article>
              );
            })
          ) : (
            <article className="card connection-card">
              <div>
                <h3>Sin tiendas</h3>
                <p>La creación y asociación de tiendas sigue operando desde el runtime legacy restaurado.</p>
              </div>
            </article>
          )}
        </section>
      </section>

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>E-commerce</strong>
            <span>Shopify y WooCommerce de la tienda seleccionada.</span>
          </div>
        </div>
        <section className="connections-grid">
          {selectedCommerceRows.length ? (
            selectedCommerceRows.map((row) => (
              <article className="card connection-card" key={row.key}>
                <div className="connection-card-head">
                  <div>
                    <h3>{row.provider}</h3>
                    <p>{row.storeName}</p>
                  </div>
                  <StatusPill tone={toneForStatus(row.status)} small>
                    {row.status === "connected" ? "Activa" : row.status === "attention" ? "Atencion" : "Desconectada"}
                  </StatusPill>
                </div>
                <div className="connection-card-meta">
                  <span className="pill">{row.label}</span>
                  {row.secondary ? <span className="pill">{row.secondary}</span> : null}
                </div>
                <div className="connection-card-actions">
                  <span>{row.detail}</span>
                  {row.provider === "Shopify" ? (
                    <button
                      className="btn btn-ghost btn-compact"
                      type="button"
                      disabled={actionLoadingKey === `disconnect:shopify:${row.storeId}`}
                      onClick={() => {
                        void disconnectProvider("shopify", row.storeId, row.secondary);
                      }}
                    >
                      Desconectar
                    </button>
                  ) : null}
                  {row.provider === "WooCommerce" ? (
                    <button
                      className="btn btn-ghost btn-compact"
                      type="button"
                      disabled={actionLoadingKey === `disconnect:woocommerce:${row.storeId}`}
                      onClick={() => {
                        void disconnectProvider("woocommerce", row.storeId, row.secondary);
                      }}
                    >
                      Desconectar
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="card connection-card">
              <div>
                <h3>Sin conexiones de commerce</h3>
                <p>El alta y reconnect siguen viviendo en el wizard legacy.</p>
              </div>
            </article>
          )}
        </section>
      </section>

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>Contabilidad</strong>
            <span>Cuentas Alegra de la tienda seleccionada.</span>
          </div>
        </div>
        <section className="connections-grid">
          {selectedAccountingRows.length ? (
            selectedAccountingRows.map((row) => (
              <article className="card connection-card" key={row.key}>
                <div className="connection-card-head">
                  <div>
                    <h3>{row.provider}</h3>
                    <p>{row.storeName}</p>
                  </div>
                  <StatusPill tone={toneForStatus(row.status)} small>
                    {row.status === "connected" ? "Activa" : row.status === "attention" ? "Atencion" : "Desconectada"}
                  </StatusPill>
                </div>
                <div className="connection-card-meta">
                  <span className="pill">{row.label}</span>
                </div>
                <div className="connection-card-actions">
                  <span>{row.detail}</span>
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={actionLoadingKey === `disconnect:alegra:${row.storeId}`}
                    onClick={() => {
                      void disconnectProvider("alegra", row.storeId);
                    }}
                  >
                    Desconectar
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="card connection-card">
              <div>
                <h3>Sin cuentas Alegra visibles</h3>
                <p>La asociación o reconexión sigue operando desde el módulo legacy.</p>
              </div>
            </article>
          )}
        </section>
      </section>

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>Ads</strong>
            <span>Estado global de credenciales y spend sync.</span>
          </div>
        </div>
        <section className="connections-grid">
          {workspaceState.ads.map((ad) => (
            <article className="card connection-card" key={ad.key}>
              <div className="connection-card-head">
                <div>
                  <h3>{ad.label}</h3>
                  <p>Integración global del tenant</p>
                </div>
                <StatusPill tone={toneForStatus(ad.status)} small>
                  {ad.status === "connected" ? "Activa" : ad.status === "attention" ? "Atencion" : "Desconectada"}
                </StatusPill>
              </div>
              <div className="connection-card-actions">
                <span>{ad.detail}</span>
              </div>
            </article>
          ))}
        </section>
      </section>

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>Webhooks Shopify</strong>
            <span>Estado y control inicial para la tienda seleccionada.</span>
          </div>
        </div>
        <article className="card connection-card">
          {selectedStore?.providers.shopify?.shopDomain ? (
            <>
              <div className="connection-card-head">
                <div>
                  <h3>{selectedStore.providers.shopify.label}</h3>
                  <p>{selectedStore.providers.shopify.shopDomain}</p>
                </div>
                {webhookStatus ? (
                  <StatusPill tone={webhookStatus.ok ? "success" : webhookStatus.connected ? "warning" : "error"} small>
                    {webhookStatus.ok ? "Completos" : `${webhookStatus.connected}/${webhookStatus.total}`}
                  </StatusPill>
                ) : (
                  <span className="pill">{webhookLoading ? "Consultando..." : "Sin datos"}</span>
                )}
              </div>
              <div className="connection-card-actions">
                <button
                  className="btn btn-ghost btn-compact"
                  type="button"
                  disabled={webhookLoading}
                  onClick={() => {
                    void loadWebhookStatus(selectedStore.providers.shopify?.shopDomain || "");
                  }}
                >
                  Estado
                </button>
                <button
                  className="btn btn-ghost btn-compact"
                  type="button"
                  disabled={actionLoadingKey === "webhooks:create"}
                  onClick={() => {
                    void runWebhookAction("create");
                  }}
                >
                  Crear
                </button>
                <button
                  className="btn btn-ghost btn-compact"
                  type="button"
                  disabled={actionLoadingKey === "webhooks:delete"}
                  onClick={() => {
                    void runWebhookAction("delete");
                  }}
                >
                  Eliminar
                </button>
              </div>
              {webhookStatus ? (
                <div className="connection-card-meta">
                  <span className="pill">Topics {webhookStatus.connected}/{webhookStatus.total}</span>
                  {webhookStatus.missing.length ? (
                    <span className="pill pill-warning">Faltan {webhookStatus.missing.join(", ")}</span>
                  ) : (
                    <span className="pill pill-success">Todos presentes</span>
                  )}
                </div>
              ) : null}
              {webhookStatus?.callbackUrl ? <p className="connection-inline-note">{webhookStatus.callbackUrl}</p> : null}
            </>
          ) : (
            <div>
              <h3>Sin Shopify activo</h3>
              <p>Selecciona una tienda que tenga Shopify configurado para consultar o administrar webhooks.</p>
            </div>
          )}
        </article>
      </section>

      <section className="connections-grid">
        {connections.map((connection) => (
          <article className="card connection-card" key={connection.id}>
            <div className="connection-card-head">
              <div>
                <h3>{connection.label}</h3>
                <p>{connection.detail}</p>
              </div>
              <StatusPill tone={toneForStatus(connection.status)} small>
                {connection.status === "connected" ? "Activa" : connection.status === "attention" ? "Atencion" : "Desconectada"}
              </StatusPill>
            </div>
            <div className="connection-card-meta">
              <span className="pill">{connection.provider}</span>
              <span className="pill">{connection.lastSyncAt?.slice(0, 16).replace("T", " ") ?? "Sin sync"}</span>
            </div>
            <div className="connection-card-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setSelected(connection)}>
                Ver detalle
              </button>
            </div>
          </article>
        ))}
      </section>

      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="connection-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Conexion</p>
                <h3 id="connection-modal-title">{selected.label}</h3>
              </div>
              <button className="btn btn-ghost btn-compact" type="button" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-row">
                <span>Proveedor</span>
                <strong>{selected.provider}</strong>
              </div>
              <div className="modal-row">
                <span>Estado</span>
                <StatusPill tone={toneForStatus(selected.status)} small>
                  {selected.status}
                </StatusPill>
              </div>
              <div className="modal-row">
                <span>Detalle</span>
                <strong>{selected.detail}</strong>
              </div>
              <div className="modal-row">
                <span>Ultimo sync</span>
                <strong>{selected.lastSyncAt?.slice(0, 19).replace("T", " ") ?? "Sin registro"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
