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
      setStatusMessage("Usuario creado.");
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
      setStatusMessage("Usuario eliminado.");
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
        subtitle="Alta y roles del equipo."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Usuarios</span>
          </>
        }
        actions={
          <>
            <span className="pill">{initialUsers.length} total</span>
            <span className="pill">{initialUsers.filter((user) => user.role === "admin").length} admin</span>
            <a className="btn ghost" href="/legacy/settings">
              Configuración avanzada
            </a>
          </>
        }
      />

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>Crear usuario</h3>
          </div>
        </div>
        <div className="settings-subsection">
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
              {!canAssignRoles ? <small>Admin solo para super admins ApiFlujos.</small> : null}
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
