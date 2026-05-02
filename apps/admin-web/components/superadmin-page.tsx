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
        subtitle="Tenants, planes y usuarios ApiFlujos."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Super Admin</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar usuario ApiFlujos..." aria-label="Buscar usuario super admin" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Usuarios · {overview.summary.usersCount}
            </span>
            <span className="pill">
              Tenants · {overview.summary.tenantsCount}
            </span>
            <span className="pill">
              Planes · {overview.summary.plansCount}
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
          <p className="stat-label">Tenants</p>
          <strong>{overview.tenantsCount}</strong>
          <span className="stat-note">Organizaciones registradas</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Planes</p>
          <strong>{overview.plansCount}</strong>
          <span className="stat-note">Planes activos</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Servicios</p>
          <strong>{overview.servicesCount}</strong>
          <span className="stat-note">Servicios base</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Usuarios ApiFlujos con acceso super admin</div>
        <DataTable
          columns={[
            {
              key: "email",
              header: "Usuario",
              render: (row) => row.email,
            },
            {
              key: "name",
              header: "Nombre",
              render: (row) => row.name || "—",
            },
            {
              key: "phone",
              header: "Teléfono",
              render: (row) => row.phone || "—",
            },
            {
              key: "role",
              header: "Acceso",
              render: () => <StatusPill tone="info" small>Super Admin</StatusPill>,
            },
            {
              key: "createdAt",
              header: "Creado",
              render: (row) => row.createdAt.slice(0, 16).replace("T", " "),
            },
          ]}
          rows={overview.users}
        />
      </div>
    </section>
  );
}
