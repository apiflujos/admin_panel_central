import type {
  AdminWebDashboardHighlightRowDto,
  AdminWebDashboardOverviewDto,
} from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { StatusPill } from "./ui/status-pill";

function formatHighlightMetric(row: AdminWebDashboardHighlightRowDto) {
  if (row.kind === "log") return "Incidencia";
  return row.metric || "Actividad";
}

function buildHealthBars(overview: AdminWebDashboardOverviewDto) {
  const raw = [
    { label: "Conexiones", value: overview.activeConnections, tone: "success" },
    { label: "Pedidos", value: overview.totalOrders, tone: "info" },
    { label: "Productos", value: overview.totalProducts, tone: "primary" },
    { label: "Atención", value: overview.pendingActions, tone: "warning" },
    { label: "Fallos", value: overview.failedLogs, tone: "danger" },
  ];
  const max = Math.max(...raw.map((item) => item.value), 1);
  return raw.map((item) => ({
    ...item,
    width: `${Math.max(10, Math.round((item.value / max) * 100))}%`,
  }));
}

export function DashboardPage({ overview }: { overview: AdminWebDashboardOverviewDto }) {
  const healthBars = buildHealthBars(overview);
  const highlights = overview.highlights.slice(0, 4);

  return (
    <section className="page-stack metrics-page">
      <section className="card metrics-shell metrics-shell-compact">
        <section className="metrics-kpis metrics-kpis-dashboard metrics-kpis-compact">
          <article className="card metrics-kpi metrics-kpi-primary">
            <span className="metrics-kpi-label">Productos</span>
            <strong>{overview.totalProducts}</strong>
          </article>
          <article className="card metrics-kpi metrics-kpi-success">
            <span className="metrics-kpi-label">Conexiones</span>
            <strong>{overview.activeConnections}</strong>
            <p>{overview.moduleCount} módulos</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-warning">
            <span className="metrics-kpi-label">Pedidos 7 días</span>
            <strong>{overview.totalOrders}</strong>
          </article>
          <article className="card metrics-kpi metrics-kpi-danger">
            <span className="metrics-kpi-label">Riesgos</span>
            <strong>{overview.pendingActions + overview.failedLogs}</strong>
            <p>
              {overview.pendingActions} pendientes · {overview.failedLogs} fallidos
            </p>
          </article>
        </section>

        <section className="metrics-panels">
          <article className="card metrics-panel metrics-panel-compact">
            <div className="metrics-panel-head">
              <div>
                <h3>Salud operativa</h3>
              </div>
              <span className="pill pill-info">{overview.companyName}</span>
            </div>

            <div className="metrics-bars">
              {healthBars.map((item) => (
                <div key={item.label} className="metrics-bar-row">
                  <div className="metrics-bar-meta">
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </div>
                  <div className="metrics-bar-track">
                    <div className={`metrics-bar-fill metrics-bar-fill-${item.tone}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card metrics-panel metrics-panel-compact">
            <div className="metrics-panel-head">
              <div>
                <h3>Highlights recientes</h3>
              </div>
              <span className="pill">{highlights.length}</span>
            </div>

            <div className="metrics-highlight-grid metrics-highlight-grid-compact">
              {highlights.length ? (
                highlights.map((row) => (
                  <article className="metrics-highlight-card metrics-highlight-row" key={row.id}>
                    <div className="metrics-highlight-top">
                      <span className="metrics-highlight-kind">{row.kind}</span>
                      <StatusPill tone={toneForStatus(row.status)} small>
                        {row.status}
                      </StatusPill>
                    </div>
                    <div className="metrics-highlight-main">
                      <strong>{row.label}</strong>
                      <span className="metrics-highlight-metric">{formatHighlightMetric(row)}</span>
                    </div>
                    <p>{row.detail}</p>
                  </article>
                ))
              ) : (
                <div className="metrics-empty-state">
                  <strong>Sin highlights recientes</strong>
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </section>
  );
}
