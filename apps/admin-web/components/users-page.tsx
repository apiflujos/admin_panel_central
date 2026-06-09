"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminWebTenantUser } from "../lib/api";
import { createTenantUser, deleteTenantUser } from "../lib/api";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";

export function UsersPage({
  initialUsers,
  canAssignRoles,
}: {
  initialUsers: AdminWebTenantUser[];
  canAssignRoles: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "agent" as "admin" | "agent",
  });

  async function handleCreateUser() {
    setStatusMessage("");
    try {
      await createTenantUser({
        ...form,
        role: canAssignRoles ? form.role : undefined,
      });
      setForm({ name: "", email: "", phone: "", password: "", role: "agent" });
      setStatusMessage("Usuario creado correctamente.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    }
  }

  async function handleDeleteUser(user: AdminWebTenantUser) {
    if (!window.confirm(`Eliminar al usuario "${user.name || user.email}"?`)) {
      return;
    }
    setPendingDeleteId(user.id);
    setStatusMessage("");
    try {
      await deleteTenantUser(user.id);
      setStatusMessage("Usuario eliminado correctamente.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Usuarios"
        subtitle="Alta y roles."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Usuarios</span>
          </>
        }
        actions={
          <a className="btn ghost" href="/legacy/settings">
            Ver ajustes avanzados
          </a>
        }
      />

      <section className="metrics-kpis metrics-kpis-tight">
        <article className="metrics-kpi metrics-kpi-primary">
          <span className="metrics-kpi-label">Usuarios</span>
          <strong>{initialUsers.length}</strong>
          <span className="stat-note">Identidades activas del cliente</span>
        </article>
        <article className="metrics-kpi metrics-kpi-success">
          <span className="metrics-kpi-label">Admins</span>
          <strong>{initialUsers.filter((user) => user.role === "admin").length}</strong>
          <span className="stat-note">Capacidad operativa ampliada</span>
        </article>
        <article className="metrics-kpi metrics-kpi-warning">
          <span className="metrics-kpi-label">Política de roles</span>
          <strong>{canAssignRoles ? "Amplia" : "Restringida"}</strong>
          <span className="stat-note">Solo super admins asignan admin</span>
        </article>
      </section>

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>Crear usuario</h3>
            <p>Alta básica.</p>
          </div>
          <div className="page-module-actions">
            <span className="pill pill-info">Alta</span>
          </div>
        </div>
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <div>
              <strong>Identidad base</strong>
              <span>Datos de contacto y credenciales iniciales.</span>
            </div>
          </div>
          <div className="settings-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              />
            </label>
          </div>
        </div>
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <div>
              <strong>Acceso y permisos</strong>
              <span>El backend sigue limitando la asignación de roles elevados.</span>
            </div>
          </div>
          <div className="settings-grid">
            <div className="field">
              <span>Rol</span>
              <div className="segmented-toggle" role="group" aria-label="Rol">
                <button
                  className={`btn ${form.role === "agent" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, role: "agent" }))}
                >
                  Agente
                </button>
                <button
                  className={`btn ${form.role === "admin" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  disabled={!canAssignRoles}
                  onClick={() => setForm((c) => ({ ...c, role: "admin" }))}
                >
                  Admin
                </button>
              </div>
              <small>
                {canAssignRoles
                  ? "Usa admin solo si lo necesita."
                  : "Admin solo para super admins ApiFlujos."}
              </small>
            </div>
          </div>
        </div>
        <div className="page-module-actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => void handleCreateUser()}
            disabled={isPending || pendingDeleteId !== null}
          >
            Crear usuario
          </button>
        </div>
        {statusMessage ? <p className="connection-status-note">{statusMessage}</p> : null}
      </section>

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>Equipo</h3>
            <p>Usuarios activos.</p>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "user",
              header: "Usuario",
              render: (user) => (
                <div className="entity-cell">
                  <strong>{user.name || "Sin nombre"}</strong>
                  <span>{user.email}</span>
                </div>
              ),
            },
            {
              key: "role",
              header: "Rol y alta",
              render: (user) => (
                <div className="status-stack">
                  <span className={`pill ${user.role === "admin" ? "pill-ok" : "pill-info"}`}>
                    {user.role === "admin" ? "Admin" : "Agente"}
                  </span>
                  <span>{new Date(user.createdAt).toLocaleDateString("es-CO")}</span>
                </div>
              ),
            },
            {
              key: "contact",
              header: "Contacto",
              render: (user) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{user.phone || "—"}</strong>
                  <span>{user.email}</span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (user) => (
                <button
                  className="btn ghost btn-compact"
                  type="button"
                  onClick={() => void handleDeleteUser(user)}
                  disabled={isPending || pendingDeleteId === user.id}
                >
                  {pendingDeleteId === user.id ? "Eliminando..." : "Eliminar"}
                </button>
              ),
            },
          ]}
          rows={initialUsers}
          getRowKey={(user) => `tenant-user:${user.id}`}
          emptyState="Sin usuarios."
        />
      </section>
    </section>
  );
}
