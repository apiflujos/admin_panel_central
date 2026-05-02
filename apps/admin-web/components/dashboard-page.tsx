import type { AdminWebDashboardOverviewDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function DashboardPage({ overview }: { overview: AdminWebDashboardOverviewDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Métricas"
        subtitle="Ventas, pedidos y actividad en un solo lugar."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Métricas</span>
          </>
        }
      />

      <PageToolbar
        filters={
          <>
            <span className="pill pill-info">
              Módulos · {overview.moduleCount}
            </span>
            <span className="pill">
              Conexiones · {overview.activeConnections}
            </span>
            <span className="pill">
              Pendientes · {overview.pendingActions}
            </span>
          </>
        }
      />

      <section className="stats-grid stats-grid-tight">
        <article className="card stat-card">
          <p className="stat-label">Productos</p>
          <strong>{overview.totalProducts}</strong>
          <span className="stat-note">Catálogo</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Pedidos</p>
          <strong>{overview.totalOrders}</strong>
          <span className="stat-note">Operación</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Logs fallidos</p>
          <strong>{overview.failedLogs}</strong>
          <span className="stat-note">Atención</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Puntos de atención y actividad reciente del sistema</div>
        <DataTable
          columns={[
            {
              key: "kind",
              header: "Tipo",
              render: (row) => row.kind,
            },
            {
              key: "label",
              header: "Etiqueta",
              render: (row) => row.label,
            },
            {
              key: "detail",
              header: "Detalle",
              render: (row) => row.detail,
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => (
                <StatusPill tone={toneForStatus(row.status)} small>
                  {row.status}
                </StatusPill>
              ),
            },
            {
              key: "metric",
              header: "Métrica",
              render: (row) => row.metric,
            },
          ]}
          rows={overview.highlights}
        />
      </div>
    </section>
  );
}
