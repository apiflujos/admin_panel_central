import { Search } from "lucide-react";
import type { AdminWebLogsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { Paginacion } from "./ui/paginacion";
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

export function LogsPage({
  result,
  offset = 0,
  filtros = "",
}: {
  result: AdminWebLogsListDto;
  offset?: number;
  filtros?: string;
}) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Logs"
        subtitle="Trazas, errores y reintentos."
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
                  <Search size={14} strokeWidth={1.75} />
                </span>
                <input
                  className="input"
                  type="search"
                  name="orderId"
                  defaultValue={result.filters.orderId || ""}
                  placeholder="Buscar por número de pedido..."
                  aria-label="Buscar log"
                />
              </div>
            </form>
          }
          views={
            <>
              <a className={!result.filters.status ? "pill pill-info" : "pill"} href="/logs">
                Recientes · {result.summary.total}
              </a>
              <a className={result.filters.status === "fail" ? "pill pill-info" : "pill"} href="/logs?status=fail">
                Errores · {result.summary.failedCount}
              </a>
              <a
                className={result.filters.status === "retrying" ? "pill pill-info" : "pill"}
                href="/logs?status=retrying"
              >
                Reintentos · {result.summary.retryingCount}
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

        <section className="card page-module-shell">
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
          <Paginacion
            total={result.summary.total}
            offset={offset}
            porPagina={result.limit || 50}
            href={(nuevo) => `/logs?${filtros ? `${filtros}&` : ""}offset=${nuevo}`}
            etiqueta="registros"
          />
        </section>
      </div>
    </section>
  );
}
