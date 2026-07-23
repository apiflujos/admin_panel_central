import { Search } from "lucide-react";

import type { AdminWebContactsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";
import { SyncContactsButton } from "./sync-contacts-button";

type ContactRow = AdminWebContactsListDto["items"][number];

const PAGE_SIZE = 20;

export function ContactsPage({
  result,
  query,
  status,
  source,
  offset,
}: {
  result: AdminWebContactsListDto;
  query: string;
  status: string;
  source: string;
  offset: number;
}) {
  const syncedCount = result.items.filter((item) => item.syncStatus === "synced").length;
  const pendingCount = result.items.length - syncedCount;
  const recentCount = result.items.filter(
    (item) => item.updatedAt && Date.now() - new Date(item.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7
  ).length;
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < result.total;

  return (
    <section className="page-stack">
      <PageHeader
        title="Contactos"
        subtitle="Base comercial y sincronización."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Contactos</span>
          </>
        }
      />

      <PageToolbar
        search={
          <form method="get">
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="source" value={source} />
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true"><Search size={14} strokeWidth={1.75} /></span>
              <input
                className="input"
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar nombre, email o documento..."
                aria-label="Buscar contacto"
              />
            </div>
          </form>
        }
        views={
          <>
            <a
              className={status === "" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}&offset=0`}
            >
              Todos · {result.total}
            </a>
            <a
              className={status === "synced" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&status=synced&source=${encodeURIComponent(source)}&offset=0`}
            >
              Sincronizados · {syncedCount}
            </a>
            <a
              className={status === "pending" ? "pill pill-info" : "pill"}
              href={`/contacts?query=${encodeURIComponent(query)}&status=pending&source=${encodeURIComponent(source)}&offset=0`}
            >
              Pendientes · {pendingCount}
            </a>
          </>
        }
        actions={
          <>
            <SyncContactsButton />
            {hasPrev ? (
              <a
                className="btn ghost btn-compact"
                href={`/contacts?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&source=${encodeURIComponent(source)}&offset=${prevOffset}`}
              >
                Anterior
              </a>
            ) : null}
            {hasNext ? (
              <a
                className="btn primary btn-compact"
                href={`/contacts?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&source=${encodeURIComponent(source)}&offset=${nextOffset}`}
              >
                Siguiente
              </a>
            ) : null}
          </>
        }
      />

      <section className="metrics-kpis metrics-kpis-tight metrics-kpis-compact">
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Recientes</p>
          <strong>{recentCount}</strong>
          <span className="stat-note">Últimos 7 días</span>
        </article>
      </section>

      <section className="card page-module-shell page-module-shell-compact">
        <div className="table-meta">
          Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, result.total)} de {result.total} contactos
        </div>

        <DataTable<ContactRow>
          rows={result.items}
          getRowKey={(row) => row.id}
          emptyState="Sin contactos. Usa “Sincronizar contactos” para traerlos desde Alegra."
          columns={[
            {
              key: "name",
              header: "Contacto",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.name || "Sin nombre"}</strong>
                  <span>{row.source || "Fuente sin clasificar"}</span>
                </div>
              ),
            },
            {
              key: "email",
              header: "Email",
              render: (row) => row.email || "—",
            },
            {
              key: "phone",
              header: "Teléfono",
              render: (row) => row.phone || "—",
            },
            {
              key: "document",
              header: "Documento",
              render: (row) => row.document || "—",
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.syncStatus === "synced" ? (
                  <StatusPill tone="success" small>
                    Sincronizado
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    Pendiente
                  </StatusPill>
                ),
            },
            {
              key: "updatedAt",
              header: "Actualizado",
              render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("es-CO") : "—"),
            },
          ]}
        />
      </section>
    </section>
  );
}
