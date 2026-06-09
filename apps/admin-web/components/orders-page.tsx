"use client";

import { useMemo, useState } from "react";
import type { AdminWebOrdersListDto } from "../../../packages/shared/src/admin-web";
import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { toneForStatus } from "../lib/status";
import { DataTable } from "./ui/data-table";
import { InfoHint } from "./ui/info-hint";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StoreSyncActionsPanel } from "./store-sync-actions-panel";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 20;

export function OrdersPage({
  result,
  query,
  offset,
  workspace,
}: {
  result: AdminWebOrdersListDto;
  query: string;
  offset: number;
  workspace: ConnectionsWorkspace;
}) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const selectedStore = useMemo(
    () => workspace.stores.find((store) => store.id === selectedStoreId) ?? workspace.stores[0] ?? null,
    [selectedStoreId, workspace.stores]
  );
  const accountingLabel = selectedStore?.providers.alegra ? "Alegra" : "Contabilidad";
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasNext = nextOffset < result.total;
  const hasPrev = offset > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Pedidos"
        subtitle="Pedidos y facturas."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Pedidos</span>
          </>
        }
      />

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>
              Sincronización manual{" "}
              <InfoHint label={`Aquí van corridas por fecha, pedido puntual y retorno desde ${accountingLabel}.`} />
            </strong>
            <span>Fecha, puntual y retorno.</span>
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
          <span className="pill pill-info">Por fecha</span>
          <span className="pill">Pedido puntual</span>
          <span className="pill">Retorno desde {accountingLabel}</span>
          <span className="pill">Webhooks y stop</span>
        </div>
      </section>

      <StoreSyncActionsPanel
        stores={workspace.stores}
        storeConfigs={workspace.storeConfigs}
        defaults={workspace.storeConfigDefaults}
        activeStoreId={selectedStoreId}
        visibleGroups={["orders"]}
      />

      <PageToolbar
        search={
          <form method="get">
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="input"
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar pedido, cliente o email..."
                aria-label="Buscar pedido"
              />
            </div>
          </form>
        }
        filters={
          <>
            <span className="pill pill-info">Todos · {result.total}</span>
            <span className="pill">Pendientes · {result.summary.pendingCount}</span>
            <span className="pill">Facturados · {result.summary.invoicedCount}</span>
            <span className="pill">E-invoice pendiente · {result.summary.einvoicePendingCount}</span>
          </>
        }
        actions={
          <>
            {hasPrev && (
              <a
                className="btn ghost btn-compact"
                href={`/orders?query=${encodeURIComponent(query)}&offset=${prevOffset}`}
              >
                ← Anterior
              </a>
            )}
            {hasNext && (
              <a
                className="btn primary btn-compact"
                href={`/orders?query=${encodeURIComponent(query)}&offset=${nextOffset}`}
              >
                Siguiente →
              </a>
            )}
          </>
        }
      />

      <section className="metrics-kpis metrics-kpis-tight metrics-kpis-compact">
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Total pedidos</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Volumen visible en esta ventana</span>
        </article>
        <article className="metrics-kpi metrics-kpi-success">
          <p className="stat-label">Facturados</p>
          <strong>{result.summary.invoicedCount}</strong>
          <span className="stat-note">Con factura emitida en Alegra</span>
        </article>
        <article className="metrics-kpi metrics-kpi-warning">
          <p className="stat-label">Pendientes</p>
          <strong>{result.summary.pendingCount}</strong>
          <span className="stat-note">Sin cierre operativo</span>
        </article>
        <article className="metrics-kpi metrics-kpi-danger">
          <p className="stat-label">E-invoice pendiente</p>
          <strong>{result.summary.einvoicePendingCount}</strong>
          <span className="stat-note">Overrides incompletos</span>
        </article>
      </section>

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>
              Pipeline de pedidos <InfoHint label="Úsalo para revisar estados, facturación y pendientes visibles en la página actual." />
            </strong>
            <span>
              Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, result.total)} de {result.total}
            </span>
          </div>
          <div className="page-module-actions">
            <span className="pill">Facturados {result.summary.invoicedCount}</span>
            <span className="pill">Pendientes {result.summary.pendingCount}</span>
            <span className="pill pill-info">Página {Math.floor(offset / PAGE_SIZE) + 1}</span>
          </div>
        </div>
        <p className="connection-inline-note">
          Prioriza primero estados pendientes y e-invoice antes de navegar a páginas siguientes.
        </p>
        <DataTable
          columns={[
            {
              key: "orderNumber",
              header: "Pedido",
              render: (row) => (
                <div className="entity-cell">
                  <strong>#{row.orderNumber}</strong>
                  <span>{row.processedAt ? new Date(row.processedAt).toLocaleString("es-CO") : "Sin fecha"}</span>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.customer}</strong>
                  <span>{row.customerEmail || "Sin email"}</span>
                </div>
              ),
            },
            {
              key: "products",
              header: "Productos",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.products}</strong>
                  <span>{row.shopifyId ? `Shopify ${row.shopifyId}` : "Sin id Shopify"}</span>
                </div>
              ),
            },
            {
              key: "alegraStatus",
              header: "Estado",
              render: (row) => (
                <div className="status-stack">
                  <StatusPill tone={toneForStatus(row.alegraStatus)} small>
                    {row.alegraStatus}
                  </StatusPill>
                  {row.einvoiceRequested ? <span className="pill pill-sm">E-invoice solicitada</span> : null}
                </div>
              ),
            },
            {
              key: "invoiceNumber",
              header: "Factura",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.invoiceNumber || "—"}</strong>
                  <span>{row.invoiceId ? `Alegra ${row.invoiceId}` : "Sin vincular"}</span>
                </div>
              ),
            },
          ]}
          rows={result.items}
          getRowKey={(row) => row.id}
        />
      </section>
    </section>
  );
}
