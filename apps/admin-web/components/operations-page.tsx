import type { AdminWebOperationsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function OperationsPage({ result }: { result: AdminWebOperationsListDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Operaciones"
        subtitle="Ejecucion operativa Shopify ↔ Alegra."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Operaciones</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar operación o cliente..." aria-label="Buscar operación" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Todas · {result.items.length}
            </span>
            <span className="pill">
              Facturadas · {result.summary.invoicedCount}
            </span>
            <span className="pill">
              Fallidas · {result.summary.failedCount}
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-primary btn-compact" type="button">
              Refrescar
            </button>
          </>
        }
      />

      <section className="stats-grid">
        <article className="card stat-card">
          <p className="stat-label">Items</p>
          <strong>{result.items.length}</strong>
          <span className="stat-note">Últimos 7 días por defecto</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Facturadas</p>
          <strong>{result.summary.invoicedCount}</strong>
          <span className="stat-note">Con mapping/invoice</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Con error</p>
          <strong>{result.summary.failedCount}</strong>
          <span className="stat-note">Pendientes de reintento</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Operaciones listas para seguimiento en el nuevo panel</div>
        <DataTable
          columns={[
            {
              key: "orderNumber",
              header: "Pedido",
              render: (row) => row.orderNumber,
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => row.customer,
            },
            {
              key: "products",
              header: "Productos",
              render: (row) => row.products,
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.alegraStatus === "facturado" ? (
                  <StatusPill tone="success" small>
                    Facturado
                  </StatusPill>
                ) : row.errorMessage ? (
                  <StatusPill tone="error" small>
                    Falló
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    Pendiente
                  </StatusPill>
                ),
            },
            {
              key: "invoice",
              header: "Factura",
              render: (row) => row.invoiceNumber || "—",
            },
          ]}
          rows={result.items}
        />
      </div>
    </section>
  );
}
