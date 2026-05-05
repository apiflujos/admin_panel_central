import type { AdminWebProductsListDto } from "../../../packages/shared/src/admin-web";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
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
        title="Productos y servicios"
        subtitle="Catálogo operativo con foco en lectura rápida, stock y matching."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Productos y servicios</span>
          </>
        }
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
