import { Search } from "lucide-react";
import type { AdminWebSuperAdminOverviewDto } from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";
import { SqlConsole } from "./sql-console";

export function SuperAdminPage({ overview }: { overview: AdminWebSuperAdminOverviewDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Super Admin"
        subtitle="Clientes, planes y usuarios ApiFlujos."
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
              <span className="input-icon" aria-hidden="true"><Search size={14} strokeWidth={1.75} /></span>
              <input
                className="input"
                type="search"
                placeholder="Buscar usuario ApiFlujos..."
                aria-label="Buscar usuario super admin"
              />
            </div>
          }
          views={
            <>
              <span className="pill pill-info">Usuarios · {overview.summary.usersCount}</span>
              <span className="pill">Clientes · {overview.summary.tenantsCount}</span>
              <span className="pill">Planes · {overview.summary.plansCount}</span>
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
          </article>
          <article className="metrics-kpi metrics-kpi-success">
            <p className="metrics-kpi-label">Planes</p>
            <strong>{overview.plansCount}</strong>
          </article>
          <article className="metrics-kpi metrics-kpi-warning">
            <p className="metrics-kpi-label">Servicios</p>
            <strong>{overview.servicesCount}</strong>
          </article>
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Módulos</p>
            <strong>{overview.modulesCount}</strong>
          </article>
        </section>

        <section className="card page-module-shell">
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

      <SqlConsole />
    </section>
  );
}
