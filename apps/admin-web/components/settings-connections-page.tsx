"use client";

import { useState } from "react";

import type { ConnectionStatusDto, SettingsOverviewDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

type ConnectionRow = ConnectionStatusDto & { id: string };

export function SettingsConnectionsPage({
  overview,
  connections,
  summary,
}: {
  overview: SettingsOverviewDto;
  connections: ConnectionRow[];
  summary: {
    total: number;
    connectedCount: number;
    attentionCount: number;
    disconnectedCount: number;
  };
}) {
  const [selected, setSelected] = useState<ConnectionRow | null>(null);

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
          <strong>{overview.companyName}</strong>
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
