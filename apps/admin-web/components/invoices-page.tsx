import type { AdminWebInvoicesListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function InvoicesPage({ result }: { result: AdminWebInvoicesListDto }) {
  const paidCount = result.items.filter((item) => item.status === "paid").length;
  const pendingCount = result.items.length - paidCount;

  return (
    <section className="page-stack">
      <PageHeader
        title="Facturas"
        subtitle="Facturacion y estado documental."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Facturas</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar factura, pedido o cliente..." aria-label="Buscar factura" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Todas · {result.total}
            </span>
            <span className="pill">
              Pagadas · {paidCount}
            </span>
            <span className="pill">
              Pendientes · {pendingCount}
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
          <p className="stat-label">Total facturas</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Con `alegra_invoice_id` resuelto</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Renderizadas</p>
          <strong>{result.items.length}</strong>
          <span className="stat-note">Limite {result.limit}</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Pagadas</p>
          <strong>{paidCount}</strong>
          <span className="stat-note">Estado financiero normalizado</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Facturas listas para seguimiento en el nuevo panel</div>
        <DataTable
          columns={[
            {
              key: "invoiceNumber",
              header: "Factura",
              render: (row) => row.invoiceNumber || row.invoiceId || "—",
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => row.customer,
            },
            {
              key: "total",
              header: "Total",
              render: (row) => (row.total != null ? row.total.toLocaleString("es-CO") : "—"),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.status === "paid" ? (
                  <StatusPill tone="success" small>
                    Paid
                  </StatusPill>
                ) : row.status ? (
                  <StatusPill tone="warning" small>
                    {row.status}
                  </StatusPill>
                ) : (
                  <StatusPill tone="info" small>
                    —
                  </StatusPill>
                ),
            },
            {
              key: "processedAt",
              header: "Fecha",
              render: (row) => (row.processedAt ? row.processedAt.slice(0, 16).replace("T", " ") : "—"),
            },
          ]}
          rows={result.items}
        />
      </div>
    </section>
  );
}
