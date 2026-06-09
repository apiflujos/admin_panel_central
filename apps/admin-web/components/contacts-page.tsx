"use client";

import { useMemo, useState } from "react";
import type { AdminWebContactsListDto } from "../../../packages/shared/src/admin-web";
import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { InfoHint } from "./ui/info-hint";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StoreSyncActionsPanel } from "./store-sync-actions-panel";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 20;

export function ContactsPage({
  result,
  query,
  status,
  source,
  offset,
  workspace,
}: {
  result: AdminWebContactsListDto;
  query: string;
  status: string;
  source: string;
  offset: number;
  workspace: ConnectionsWorkspace;
}) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const selectedStore = useMemo(
    () => workspace.stores.find((store) => store.id === selectedStoreId) ?? workspace.stores[0] ?? null,
    [selectedStoreId, workspace.stores]
  );
  const syncedCount = result.items.filter((item) => item.syncStatus === "synced").length;
  const pendingCount = result.items.length - syncedCount;
  const recentCount = result.items.filter(
    (item) => item.updatedAt && Date.now() - new Date(item.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7
  ).length;
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < result.total;

  return (
    <section className="page-stack">
      <PageHeader
        title="Contactos"
        subtitle="Base comercial."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Contactos</span>
          </>
        }
      />

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>
              Sincronización manual <InfoHint label="Aquí van la carga inicial, corridas por fecha y detención de contactos." />
            </strong>
            <span>Inicial, fecha y stop.</span>
          </div>
          <div className="page-module-actions">
            <label className="field">
              <span>Tienda</span>
              <select
                className="input"
                value={selectedStore?.id ?? ""}
                onChange={(event) => setSelectedStoreId(Number(event.target.value || ""))}
              >
                {workspace.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="page-module-actions compact-pills">
          <span className="pill pill-info">Carga inicial</span>
          <span className="pill">Por fecha</span>
          <span className="pill">Crear o actualizar</span>
          <span className="pill">Detener corrida</span>
        </div>
      </section>

      <StoreSyncActionsPanel
        stores={workspace.stores}
        storeConfigs={workspace.storeConfigs}
        defaults={workspace.storeConfigDefaults}
        activeStoreId={selectedStoreId}
        visibleGroups={["contacts"]}
      />

      <PageToolbar
        search={
          <form method="get">
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="source" value={source} />
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="input"
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar nombre, email o documento..."
                aria-label="Buscar contacto"
              />
            </div>
          </form>
        }
        filters={
          <>
            <span className="pill pill-info">Todos · {result.total}</span>
            <span className="pill">Sincronizados · {syncedCount}</span>
            <span className="pill">Pendientes · {pendingCount}</span>
          </>
        }
        views={
          <>
            <a
              className={status === "" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}&offset=0`}
            >
              Todos
            </a>
            <a
              className={status === "synced" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&status=synced&source=${encodeURIComponent(source)}&offset=0`}
            >
              Sincronizados
            </a>
            <a
              className={status === "pending" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&status=pending&source=${encodeURIComponent(source)}&offset=0`}
            >
              Pendientes
            </a>
          </>
        }
        actions={
          <>
            {hasPrev ? (
              <a
                className="btn ghost btn-compact"
                href={`/contacts?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&source=${encodeURIComponent(source)}&offset=${prevOffset}`}
              >
                ← Anterior
              </a>
            ) : null}
            {hasNext ? (
              <a
                className="btn primary btn-compact"
                href={`/contacts?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&source=${encodeURIComponent(source)}&offset=${nextOffset}`}
              >
                Siguiente →
              </a>
            ) : null}
          </>
        }
      />

      <section className="metrics-kpis metrics-kpis-tight metrics-kpis-compact">
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Total contactos</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Base operativa local</span>
        </article>
        <article className="metrics-kpi metrics-kpi-success">
          <p className="stat-label">Sincronizados</p>
          <strong>{syncedCount}</strong>
          <span className="stat-note">Con identificadores resueltos</span>
        </article>
        <article className="metrics-kpi metrics-kpi-warning">
          <p className="stat-label">Pendientes</p>
          <strong>{pendingCount}</strong>
          <span className="stat-note">Requieren conciliación</span>
        </article>
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Recientes</p>
          <strong>{recentCount}</strong>
          <span className="stat-note">Actualizados en los últimos 7 días</span>
        </article>
      </section>

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>
              Directorio operativo <InfoHint label="Úsalo para conciliación rápida, soporte y revisión de pendientes." />
            </strong>
            <span>
              Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, result.total)} de {result.total} contactos listos
              para conciliación y soporte.
            </span>
          </div>
          <div className="page-module-actions">
            <span className="pill">Fuente {source || "Todas"}</span>
            <span className="pill">Estado {status || "Todos"}</span>
          </div>
        </div>
        <p className="connection-inline-note">
          Prioriza primero pendientes y contactos actualizados recientemente antes de revisar el resto del directorio.
        </p>

        <div className="record-grid record-grid-compact">
          {result.items.map((row) => (
            <article className="record-card record-card-compact" key={row.id}>
              <div className="record-card-head">
                <div className="record-card-avatar" aria-hidden="true">
                  {(row.name || "C").slice(0, 1).toUpperCase()}
                </div>
                <div className="record-card-title">
                  <strong>{row.name}</strong>
                  <span>{row.source || "Fuente sin clasificar"}</span>
                </div>
                {row.syncStatus === "synced" ? (
                  <StatusPill tone="success" small>
                    Sincronizado
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    Pendiente
                  </StatusPill>
                )}
              </div>

              <dl className="record-card-meta">
                <div>
                  <dt>Email</dt>
                  <dd>{row.email || "—"}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{row.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>{row.document || "—"}</dd>
                </div>
                <div>
                  <dt>Actualizado</dt>
                  <dd>{row.updatedAt ? new Date(row.updatedAt).toLocaleString("es-CO") : "Sin registro"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
