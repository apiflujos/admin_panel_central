import type { AdminWebSuperAdminOverviewDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function SuperAdminPage({ overview }: { overview: AdminWebSuperAdminOverviewDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Super Admin"
        subtitle="Clientes, planes, servicios y usuarios ApiFlujos."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Super Admin</span>
          </>
        }
      />

      <div className="card metrics-shell">
        <PageToolbar
          search={
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="input"
                type="search"
                placeholder="Buscar usuario ApiFlujos..."
                aria-label="Buscar usuario super admin"
              />
            </div>
          }
          filters={
            <>
              <span className="pill pill-info">Usuarios · {overview.summary.usersCount}</span>
              <span className="pill">Clientes · {overview.summary.tenantsCount}</span>
              <span className="pill">Planes · {overview.summary.plansCount}</span>
            </>
          }
          views={
            <>
              <span className="pill pill-info">Resumen</span>
              <span className="pill">Usuarios</span>
            </>
          }
          actions={
            <button className="btn primary btn-compact" type="button">
              Refrescar
            </button>
          }
        />

        <section className="metrics-kpis metrics-kpis-tight">
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Clientes</p>
            <strong>{overview.tenantsCount}</strong>
            <p>Organizaciones activas en la base compartida</p>
          </article>
          <article className="metrics-kpi metrics-kpi-success">
            <p className="metrics-kpi-label">Planes</p>
            <strong>{overview.plansCount}</strong>
            <p>Planes activos</p>
          </article>
          <article className="metrics-kpi metrics-kpi-warning">
            <p className="metrics-kpi-label">Servicios</p>
            <strong>{overview.servicesCount}</strong>
            <p>Servicios base disponibles</p>
          </article>
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Módulos</p>
            <strong>{overview.modulesCount}</strong>
            <p>Capacidades publicadas</p>
          </article>
        </section>

        <section className="card page-module-shell">
          <div className="page-module-head">
            <div>
              <strong>Usuarios ApiFlujos</strong>
              <span>Personal con intervención transversal sobre clientes y soporte.</span>
            </div>
            <div className="page-module-actions">
              <span className="pill">Total {overview.users.length}</span>
              <span className="pill">Acceso elevado</span>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: "email",
                header: "Usuario",
                render: (row) => (
                  <div className="entity-cell">
                    <strong>{row.email}</strong>
                    <span>{row.name || "Sin nombre"}</span>
                  </div>
                ),
              },
              {
                key: "phone",
                header: "Contacto",
                render: (row) => row.phone || "—",
              },
              {
                key: "role",
                header: "Acceso",
                render: () => (
                  <StatusPill tone="info" small>
                    Super Admin
                  </StatusPill>
                ),
              },
              {
                key: "createdAt",
                header: "Creado",
                render: (row) => (
                  <div className="entity-cell entity-cell-compact">
                    <strong>{new Date(row.createdAt).toLocaleDateString("es-CO")}</strong>
                    <span>{new Date(row.createdAt).toLocaleTimeString("es-CO")}</span>
                  </div>
                ),
              },
            ]}
            rows={overview.users}
            emptyState="No hay usuarios ApiFlujos registrados."
          />
        </section>
      </div>
    </section>
  );
}
