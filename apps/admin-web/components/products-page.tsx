import type { AdminWebProductsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 30;

export function ProductsPage({
  result,
  query,
  start,
}: {
  result: AdminWebProductsListDto;
  query: string;
  start: number;
}) {
  const rows = result.items;
  const prevStart = Math.max(0, start - PAGE_SIZE);
  const nextStart = start + PAGE_SIZE;
  const hasNext = nextStart < result.total;
  const hasPrev = start > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Productos"
        subtitle="Catalogo y estado de sincronizacion."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Productos</span>
          </>
        }
      />

      <PageToolbar
        search={
          <form method="get" style={{ width: "100%" }}>
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">⌕</span>
              <input
                className="input-control"
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar por nombre, referencia o SKU..."
                aria-label="Buscar producto"
              />
            </div>
          </form>
        }
        filters={
          <>
            <span className="pill pill-info">Todos · {result.total}</span>
            <span className="pill">Con stock · {result.summary.inStockCount}</span>
            <span className="pill">Pendientes · {result.summary.pendingCount}</span>
          </>
        }
        actions={
          <>
            {hasPrev && (
              <a className="btn btn-ghost btn-compact" href={`/products?query=${encodeURIComponent(query)}&start=${prevStart}`}>
                ← Anterior
              </a>
            )}
            {hasNext && (
              <a className="btn btn-primary btn-compact" href={`/products?query=${encodeURIComponent(query)}&start=${nextStart}`}>
                Siguiente →
              </a>
            )}
          </>
        }
      />

      <section className="stats-grid">
        <article className="card stat-card">
          <p className="stat-label">Total catálogo</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Catalogo operativo</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Matcheados</p>
          <strong>{result.summary.matchedCount}</strong>
          <span className="stat-note">Con Shopify resuelto</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Con stock</p>
          <strong>{result.summary.inStockCount}</strong>
          <span className="stat-note">Inventario positivo</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">
          Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, result.total)} de {result.total}
        </div>
        <DataTable
          columns={[
            {
              key: "reference",
              header: "Referencia",
              render: (row) => row.reference || row.sku || "—",
            },
            {
              key: "name",
              header: "Producto",
              render: (row) => row.name,
            },
            {
              key: "sync",
              header: "Estado",
              render: (row) =>
                row.shopifyProductId ? (
                  <StatusPill tone="success" small>
                    Matcheado
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    Pendiente
                  </StatusPill>
                ),
            },
            {
              key: "inventory",
              header: "Inventario",
              render: (row) => (row.inventoryQuantity ?? 0).toString(),
            },
            {
              key: "source",
              header: "Fuente",
              render: (row) => row.source || "—",
            },
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
