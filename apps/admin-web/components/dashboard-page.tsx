import type {
  AdminWebDashboardHighlightRowDto,
  AdminWebDashboardOverviewDto,
} from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { StatusPill } from "./ui/status-pill";

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

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
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  const healthBars = buildHealthBars(overview);
  const highlights = overview.highlights.slice(0, 4);

  return (
    <section className="page-stack metrics-page">
      <section className="card metrics-shell metrics-shell-compact">
        <header className="metrics-filters">
          <div className="metrics-filter-group">
            <label className="metrics-filter">
              <span>Periodo</span>
              <button className="btn ghost metrics-segment is-active" type="button">
                Día
              </button>
            </label>
            <label className="metrics-filter">
              <span>Canal</span>
              <button className="btn ghost metrics-segment" type="button">
                Todos
              </button>
            </label>
          </div>

          <div className="metrics-filter-group metrics-filter-group-dates">
            <label className="metrics-filter">
              <span>Desde</span>
              <input className="input" type="date" value={formatDateInput(from)} readOnly />
            </label>
            <label className="metrics-filter">
              <span>Hasta</span>
              <input className="input" type="date" value={formatDateInput(today)} readOnly />
            </label>
          </div>
        </header>

        <div className="metrics-tabs">
          <button className="btn ghost metrics-tab is-active" type="button">
            Resumen
          </button>
          <button className="btn ghost metrics-tab" type="button">
            Operación
          </button>
          <button className="btn ghost metrics-tab" type="button">
            Riesgos
          </button>
          <button className="btn ghost metrics-tab" type="button">
            Highlights
          </button>
        </div>

        <section className="metrics-kpis metrics-kpis-dashboard metrics-kpis-compact">
          <article className="card metrics-kpi metrics-kpi-primary">
            <span className="metrics-kpi-label">Productos activos</span>
            <strong>{overview.totalProducts}</strong>
            <p>Catálogo listo para operar</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-success">
            <span className="metrics-kpi-label">Conexiones activas</span>
            <strong>{overview.activeConnections}</strong>
            <p>{overview.moduleCount} módulos habilitados</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-warning">
            <span className="metrics-kpi-label">Pedidos 7 días</span>
            <strong>{overview.totalOrders}</strong>
            <p>Ventana operativa actual</p>
          </article>
          <article className="card metrics-kpi metrics-kpi-danger">
            <span className="metrics-kpi-label">Riesgos</span>
            <strong>{overview.pendingActions + overview.failedLogs}</strong>
            <p>
              {overview.pendingActions} pendientes · {overview.failedLogs} logs fallidos
            </p>
          </article>
        </section>

        <section className="metrics-panels">
          <article className="card metrics-panel metrics-panel-compact">
            <div className="metrics-panel-head">
              <div>
                <h3>Salud operativa</h3>
                <p>Distribución visual de los indicadores principales del cliente.</p>
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
                <p>Productos, pedidos y logs priorizados para seguimiento rápido.</p>
              </div>
              <span className="pill">{highlights.length} items</span>
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
                  <p>Cuando entren productos, pedidos o logs relevantes aparecerán aquí.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </section>
  );
}
