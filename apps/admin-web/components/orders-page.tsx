import type { AdminWebOrdersListDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 20;

export function OrdersPage({
  result,
  query,
  offset,
}: {
  result: AdminWebOrdersListDto;
  query: string;
  offset: number;
}) {
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasNext = nextOffset < result.total;
  const hasPrev = offset > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Pedidos"
        subtitle="Gestion de pedidos."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Pedidos</span>
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
          </>
        }
        actions={
          <>
            {hasPrev && (
              <a className="btn btn-ghost btn-compact" href={`/orders?query=${encodeURIComponent(query)}&offset=${prevOffset}`}>
                ← Anterior
              </a>
            )}
            {hasNext && (
              <a className="btn btn-primary btn-compact" href={`/orders?query=${encodeURIComponent(query)}&offset=${nextOffset}`}>
                Siguiente →
              </a>
            )}
          </>
        }
      />

      <section className="stats-grid">
        <article className="card stat-card">
          <p className="stat-label">Total pedidos</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Catálogo operativo local</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Facturados</p>
          <strong>{result.summary.invoicedCount}</strong>
          <span className="stat-note">Con invoice en Alegra</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">E-invoice pendiente</p>
          <strong>{result.summary.einvoicePendingCount}</strong>
          <span className="stat-note">Overrides incompletos</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">
          Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, result.total)} de {result.total}
        </div>
        <DataTable
          columns={[
            { key: "orderNumber", header: "Pedido", render: (row) => row.orderNumber },
            { key: "customer", header: "Cliente", render: (row) => row.customer },
            { key: "products", header: "Productos", render: (row) => row.products },
            {
              key: "alegraStatus",
              header: "Estado",
              render: (row) => (
                <StatusPill tone={toneForStatus(row.alegraStatus)} small>
                  {row.alegraStatus}
                </StatusPill>
              ),
            },
            { key: "invoiceNumber", header: "Factura", render: (row) => row.invoiceNumber || "—" },
          ]}
          rows={result.items}
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
