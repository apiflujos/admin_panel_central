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
        subtitle="Datos de esta instalación y herramientas de soporte de ApiFlujos."
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
                <Search size={14} strokeWidth={1.75} />
              </span>
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

        {/*
          Antes había cuatro indicadores que contaban PLANTILLAS, no cosas del
          cliente: "Planes 3" eran 3 plantillas de plan definidas en el sistema,
          no que este cliente tuviera plan. Y "Servicios" contaba en realidad
          los límites definidos: estaba mal etiquetado.

          Se sustituyen por el estado REAL de esta instalación, diciendo con
          todas las letras lo que no está configurado.
        */}
        <section className="sa-instalacion">
          <article className="sa-dato">
            <p className="sa-dato-label">Clientes en esta instalación</p>
            <strong>{overview.tenantsCount}</strong>
            <span>{overview.tenantsCount === 1 ? "Instalación de un solo cliente." : "Instalación compartida."}</span>
          </article>
          <article className="sa-dato">
            <p className="sa-dato-label">Con acceso de Super Admin</p>
            <strong>{overview.summary.usersCount}</strong>
            <span>Pueden verlo y cambiarlo todo, incluidos los trabajos automáticos.</span>
          </article>
          <article className="sa-dato">
            <p className="sa-dato-label">Módulos disponibles</p>
            <strong>{overview.modulesCount}</strong>
            <span>Integraciones que este sistema sabe manejar.</span>
          </article>
          <article className="sa-dato">
            <p className="sa-dato-label">Plantillas de plan definidas</p>
            <strong>{overview.plansCount}</strong>
            <span>Son plantillas del sistema. No significa que este cliente tenga un plan asignado.</span>
          </article>
        </section>

        <section className="card page-module-shell">
          <h3 className="worker-group-title">Quién tiene acceso de Super Admin</h3>
          <p className="worker-group-description">
            Estas personas pueden cambiar la configuración de todas las tiendas y encender o apagar los trabajos
            automáticos.
          </p>
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

      <section className="card page-module-shell">
        <h3 className="worker-group-title">Consulta directa a la base de datos</h3>
        <p className="worker-group-description">
          Herramienta de soporte de ApiFlujos para diagnosticar con datos reales. Úsala sólo para leer.
        </p>
        <SqlConsole />
      </section>
    </section>
  );
}
