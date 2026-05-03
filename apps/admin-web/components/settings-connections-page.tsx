"use client";

import { useState } from "react";

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
  workspace: {
    companyName: string;
    securityMisconfigured: boolean;
    stores: WorkspaceStore[];
    ads: WorkspaceAds[];
  };
}) {
  const [selected, setSelected] = useState<ConnectionRow | null>(null);
  const commerceRows = workspace.stores.flatMap((store) =>
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
    }>
  );
  const accountingRows = workspace.stores
    .filter((store) => store.providers.alegra)
    .map((store) => ({
      key: `alegra:${store.id}`,
      provider: "Alegra",
      storeName: store.name,
      label: store.providers.alegra?.label || "",
      status: store.providers.alegra?.status || "disconnected",
      detail: store.providers.alegra?.detail || "Sin configurar",
    }));

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
          <strong>{workspace.companyName}</strong>
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

      {workspace.securityMisconfigured ? (
        <article className="card stat-card">
          <p className="stat-label">Seguridad</p>
          <strong>CRYPTO_KEY_BASE64 inestable</strong>
          <span className="stat-note">Hay credenciales guardadas que requieren reconexión.</span>
        </article>
      ) : null}

      <section className="connection-section">
        <div className="page-toolbar">
          <div className="page-toolbar-title">
            <strong>Tiendas conectadas</strong>
            <span>Vista de lectura real por tienda antes del portado mutativo.</span>
          </div>
        </div>
        <section className="connections-grid">
          {workspace.stores.length ? (
            workspace.stores.map((store) => {
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
            <span>Shopify y WooCommerce agrupados por tienda.</span>
          </div>
        </div>
        <section className="connections-grid">
          {commerceRows.length ? (
            commerceRows.map((row) => (
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
            <span>Cuentas Alegra asociadas por tienda.</span>
          </div>
        </div>
        <section className="connections-grid">
          {accountingRows.length ? (
            accountingRows.map((row) => (
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
          {workspace.ads.map((ad) => (
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
