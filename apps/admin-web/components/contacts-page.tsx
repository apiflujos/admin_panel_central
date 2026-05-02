import type { AdminWebContactsListDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function ContactsPage({ result }: { result: AdminWebContactsListDto }) {
  const syncedCount = result.items.filter((item) => item.syncStatus === "synced").length;
  const pendingCount = result.items.length - syncedCount;

  return (
    <section className="page-stack">
      <PageHeader
        title="Contactos"
        subtitle="Base comercial y estado de sincronizacion."
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
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar nombre, email o documento..." aria-label="Buscar contacto" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Todos · {result.total}
            </span>
            <span className="pill">
              Sincronizados · {syncedCount}
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
          <p className="stat-label">Total contactos</p>
          <strong>{result.total}</strong>
          <span className="stat-note">Base operativa local</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Sincronizados</p>
          <strong>{syncedCount}</strong>
          <span className="stat-note">Con identifiers resueltos</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Página actual</p>
          <strong>{result.items.length}</strong>
          <span className="stat-note">Limite {result.limit}</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Contactos normalizados para el nuevo panel operativo</div>
        <DataTable
          columns={[
            {
              key: "name",
              header: "Contacto",
              render: (row) => row.name,
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
              key: "syncStatus",
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
              key: "source",
              header: "Fuente",
              render: (row) => row.source || "—",
            },
          ]}
          rows={result.items}
        />
      </div>
    </section>
  );
}
