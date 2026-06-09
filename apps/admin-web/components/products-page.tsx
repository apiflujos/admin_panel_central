"use client";

import { useMemo, useState } from "react";
import type { AdminWebProductsListDto } from "../../../packages/shared/src/admin-web";
import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { InfoHint } from "./ui/info-hint";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StoreSyncActionsPanel } from "./store-sync-actions-panel";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 30;

function buildProductMonogram(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "AF";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "AF";
}

export function ProductsPage({
  result,
  query,
  start,
  workspace,
}: {
  result: AdminWebProductsListDto;
  query: string;
  start: number;
  workspace: ConnectionsWorkspace;
}) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const selectedStore = useMemo(
    () => workspace.stores.find((store) => store.id === selectedStoreId) ?? workspace.stores[0] ?? null,
    [selectedStoreId, workspace.stores]
  );
  const rows = result.items;
  const prevStart = Math.max(0, start - PAGE_SIZE);
  const nextStart = start + PAGE_SIZE;
  const hasNext = nextStart < result.total;
  const hasPrev = start > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Productos y servicios"
        subtitle="Catálogo y corridas manuales por tienda."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Productos y servicios</span>
          </>
        }
      />

      <section className="card page-module-shell page-module-shell-compact products-sync-shell">
        <div className="page-module-head">
          <div>
            <strong>
              Manual por tienda{" "}
              <InfoHint label="Aquí viven la carga inicial, corridas por fecha, puntuales y stock por bodegas." />
            </strong>
            <span>Inicial, por fecha o puntual.</span>
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
        <div className="page-module-actions compact-pills sync-quick-pills">
          <span className="pill pill-info">Inicial</span>
          <span className="pill">Por fecha</span>
          <span className="pill">SKU / barcode</span>
          <span className="pill">Stock / bodegas</span>
        </div>
      </section>

      <StoreSyncActionsPanel
        stores={workspace.stores}
        storeConfigs={workspace.storeConfigs}
        defaults={workspace.storeConfigDefaults}
        activeStoreId={selectedStoreId}
        visibleGroups={["products"]}
      />

      <section className="card metrics-shell metrics-shell-compact">
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
                  placeholder="Buscar producto, referencia o SKU..."
                  aria-label="Buscar producto"
                />
              </div>
            </form>
          }
          filters={
            <>
              <span className="pill pill-info">Todos · {result.total}</span>
              <span className="pill">Matcheados · {result.summary.matchedCount}</span>
              <span className="pill">Con stock · {result.summary.inStockCount}</span>
              <span className="pill">Pendientes · {result.summary.pendingCount}</span>
            </>
          }
          actions={
            <>
              {hasPrev && (
                <a
                  className="btn ghost btn-compact"
                  href={`/products?query=${encodeURIComponent(query)}&start=${prevStart}`}
                >
                  ← Anterior
                </a>
              )}
              {hasNext && (
                <a
                  className="btn primary btn-compact"
                  href={`/products?query=${encodeURIComponent(query)}&start=${nextStart}`}
                >
                  Siguiente →
                </a>
              )}
            </>
          }
        />

        <section className="products-summary-grid metrics-kpis-compact">
          <article className="card metrics-kpi metrics-kpi-primary">
            <span className="metrics-kpi-label">Catálogo total</span>
            <strong>{result.total}</strong>
            <p>Items visibles en el cliente</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-success">
            <span className="metrics-kpi-label">Con matching</span>
            <strong>{result.summary.matchedCount}</strong>
            <p>Resueltos contra Shopify</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-warning">
            <span className="metrics-kpi-label">Pendientes</span>
            <strong>{result.summary.pendingCount}</strong>
            <p>Requieren revisión operativa</p>
          </article>
        </section>

        <div className="table-meta">
          Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, result.total)} de {result.total}
        </div>
        <p className="connection-inline-note">
          Revisa primero pendientes de matching y luego productos con stock para acelerar decisiones de publicación.
        </p>

        <section className="products-card-grid products-card-grid-compact">
          {rows.length ? (
            rows.map((row) => (
              <article className="card product-card product-card-compact" key={row.id}>
                <div className="product-card-media">
                  <span>{buildProductMonogram(row.name)}</span>
                </div>

                <div className="product-card-body">
                  <div className="product-card-head">
                    <div>
                      <h3>{row.name}</h3>
                      <p>
                        {row.reference || row.sku || "Sin referencia"} · {row.source || "Catálogo"}
                      </p>
                    </div>
                    <strong className="product-card-stock">{row.inventoryQuantity ?? 0} uds</strong>
                  </div>

                  <div className="product-card-meta">
                    {row.shopifyProductId ? (
                      <StatusPill tone="success" small>
                        Matcheado
                      </StatusPill>
                    ) : (
                      <StatusPill tone="warning" small>
                        Pendiente
                      </StatusPill>
                    )}
                    {row.alegraStatus ? <span className="pill">{row.alegraStatus}</span> : null}
                    {row.shopifyStatus ? <span className="pill pill-info">{row.shopifyStatus}</span> : null}
                  </div>

                  <div className="product-card-details">
                    <div>
                      <span>SKU</span>
                      <strong>{row.sku || "—"}</strong>
                    </div>
                    <div>
                      <span>Fuente</span>
                      <strong>{row.source || "—"}</strong>
                    </div>
                    <div>
                      <span>Actualizado</span>
                      <strong>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("es-CO") : "—"}</strong>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="metrics-empty-state">
              <strong>Sin resultados</strong>
              <p>No encontramos productos con los filtros actuales.</p>
            </div>
          )}
        </section>
      </section>
    </section>
  );
}
