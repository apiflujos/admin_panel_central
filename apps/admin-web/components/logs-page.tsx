import type { AdminWebLogsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

function toneForLogStatus(status: string) {
  if (status === "success") return "success";
  if (status === "fail") return "error";
  if (status === "retrying") return "warning";
  return "info";
}

function labelForLogStatus(status: string) {
  if (status === "success") return "Éxito";
  if (status === "fail") return "Falló";
  if (status === "retrying") return "Reintentando";
  return status || "—";
}

export function LogsPage({ result }: { result: AdminWebLogsListDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Logs"
        subtitle="Trazas, errores y reintentos de sincronización."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Logs</span>
          </>
        }
      />

      <div className="card metrics-shell">
        <PageToolbar
          search={
            <form method="get">
              <input type="hidden" name="status" value={result.filters.status || ""} />
              <input type="hidden" name="entity" value={result.filters.entity || ""} />
              <input type="hidden" name="direction" value={result.filters.direction || ""} />
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="input"
                  type="search"
                  name="orderId"
                  defaultValue={result.filters.orderId || ""}
                  placeholder="Buscar orderId..."
                  aria-label="Buscar log"
                />
              </div>
            </form>
          }
          filters={
            <>
              <span className="pill pill-info">Últimos {result.summary.total}</span>
              <span className="pill">Fallidos · {result.summary.failedCount}</span>
              <span className="pill">Reintentando · {result.summary.retryingCount}</span>
            </>
          }
          views={
            <>
              <a className={!result.filters.status ? "pill pill-info" : "pill"} href="/logs">
                Recientes
              </a>
              <a className={result.filters.status === "fail" ? "pill pill-info" : "pill"} href="/logs?status=fail">
                Errores
              </a>
              <a
                className={result.filters.status === "retrying" ? "pill pill-info" : "pill"}
                href="/logs?status=retrying"
              >
                Reintentos
              </a>
            </>
          }
          actions={
            <form method="get" className="page-toolbar-right">
              <input type="hidden" name="orderId" value={result.filters.orderId || ""} />
              <input
                className="input toolbar-date-input toolbar-date-input-sm"
                type="date"
                name="from"
                defaultValue={result.filters.from || ""}
                aria-label="Fecha desde logs"
              />
              <input
                className="input toolbar-date-input toolbar-date-input-sm"
                type="date"
                name="to"
                defaultValue={result.filters.to || ""}
                aria-label="Fecha hasta logs"
              />
              <button className="btn primary btn-compact" type="submit">
                Filtrar
              </button>
            </form>
          }
        />

        <section className="metrics-kpis metrics-kpis-tight">
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Total</p>
            <strong>{result.summary.total}</strong>
            <p>Filas renderizadas</p>
          </article>
          <article className="metrics-kpi metrics-kpi-danger">
            <p className="metrics-kpi-label">Fallidos</p>
            <strong>{result.summary.failedCount}</strong>
            <p>Requieren atención</p>
          </article>
          <article className="metrics-kpi metrics-kpi-warning">
            <p className="metrics-kpi-label">Reintentos</p>
            <strong>{result.summary.retryingCount}</strong>
            <p>En cola o reintento</p>
          </article>
          <article className="metrics-kpi metrics-kpi-success">
            <p className="metrics-kpi-label">Éxitos visibles</p>
            <strong>
              {Math.max(result.summary.total - result.summary.failedCount - result.summary.retryingCount, 0)}
            </strong>
            <p>Éxitos dentro del set actual</p>
          </article>
        </section>

        <section className="card page-module-shell">
          <div className="page-module-head">
            <div>
              <strong>Registro operativo</strong>
              <span>Últimos eventos relevantes para soporte, triage y auditoría.</span>
            </div>
            <div className="page-module-actions">
              <span className="pill">Entidad {result.filters.entity || "Todas"}</span>
              <span className="pill">Estado {result.filters.status || "Todos"}</span>
            </div>
          </div>
          <DataTable
            columns={[
              {
                key: "entity",
                header: "Entidad",
                render: (row) => (
                  <div className="entity-cell">
                    <strong>{row.entity}</strong>
                    <span>{row.direction}</span>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Estado",
                render: (row) => (
                  <StatusPill tone={toneForLogStatus(row.status)} small>
                    {labelForLogStatus(row.status)}
                  </StatusPill>
                ),
              },
              {
                key: "message",
                header: "Mensaje",
                render: (row) => (
                  <div className="entity-cell">
                    <strong>{row.message || "—"}</strong>
                    <span>{row.orderId || "Sin orderId"}</span>
                  </div>
                ),
              },
              {
                key: "createdAt",
                header: "Fecha",
                render: (row) => (
                  <div className="entity-cell entity-cell-compact">
                    <strong>{new Date(row.createdAt).toLocaleDateString("es-CO")}</strong>
                    <span>{new Date(row.createdAt).toLocaleTimeString("es-CO")}</span>
                  </div>
                ),
              },
            ]}
            rows={result.items}
          />
        </section>
      </div>
    </section>
  );
}
