import type { AdminWebLogsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function LogsPage({ result }: { result: AdminWebLogsListDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Logs"
        subtitle="Trazas y errores de sincronizacion."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Logs</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar orderId o mensaje..." aria-label="Buscar log" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Últimos {result.summary.total}
            </span>
            <span className="pill">
              Fail · {result.summary.failedCount}
            </span>
            <span className="pill">
              Retrying · {result.summary.retryingCount}
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
          <p className="stat-label">Total</p>
          <strong>{result.summary.total}</strong>
          <span className="stat-note">Filas renderizadas</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Fallidos</p>
          <strong>{result.summary.failedCount}</strong>
          <span className="stat-note">Requieren atención</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Retrying</p>
          <strong>{result.summary.retryingCount}</strong>
          <span className="stat-note">En cola</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Registro operativo de sincronizaciones</div>
        <DataTable
          columns={[
            {
              key: "entity",
              header: "Entidad",
              render: (row) => row.entity,
            },
            {
              key: "direction",
              header: "Dirección",
              render: (row) => row.direction,
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.status === "success" ? (
                  <StatusPill tone="success" small>
                    Success
                  </StatusPill>
                ) : row.status === "fail" ? (
                  <StatusPill tone="error" small>
                    Fail
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    {row.status}
                  </StatusPill>
                ),
            },
            {
              key: "message",
              header: "Mensaje",
              render: (row) => row.message || "—",
            },
            {
              key: "createdAt",
              header: "Fecha",
              render: (row) => row.createdAt.slice(0, 16).replace("T", " "),
            },
          ]}
          rows={result.items}
        />
      </div>
    </section>
  );
}
