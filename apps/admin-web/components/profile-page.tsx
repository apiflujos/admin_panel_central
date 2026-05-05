"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveProfile } from "../lib/api";
import { PageHeader } from "./ui/page-header";

export function ProfilePage({
  initialProfile,
}: {
  initialProfile: {
    id: number;
    organizationId: number;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    name: string | null;
    phone: string | null;
    photoBase64: string | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    name: initialProfile.name || "",
    email: initialProfile.email || "",
    phone: initialProfile.phone || "",
    photoBase64: initialProfile.photoBase64 || "",
  });

  async function handleSave() {
    setStatusMessage("");
    try {
      await saveProfile(form);
      setStatusMessage("Perfil actualizado correctamente.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Perfil"
        subtitle="Identidad, contacto y avatar del usuario dentro de la superficie principal."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Perfil</span>
          </>
        }
        actions={
          <a className="btn ghost" href="/">
            Volver al inicio
          </a>
        }
      />

      <section className="metrics-kpis-tight">
        <article className="metric-card metric-card-violet">
          <span className="metric-label">Rol operativo</span>
          <strong className="metric-value">{initialProfile.isSuperAdmin ? "Super Admin" : initialProfile.role}</strong>
          <span className="metric-note">Permisos actuales del usuario</span>
        </article>
        <article className="metric-card metric-card-mint">
          <span className="metric-label">Canal principal</span>
          <strong className="metric-value">{form.email ? form.email.split("@")[1] || "N/D" : "N/D"}</strong>
          <span className="metric-note">Dominio del correo autenticado</span>
        </article>
        <article className="metric-card metric-card-amber">
          <span className="metric-label">Avatar</span>
          <strong className="metric-value">{form.photoBase64 ? "Cargado" : "Pendiente"}</strong>
          <span className="metric-note">Branding personal en sesiones y menús</span>
        </article>
      </section>

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>Mi perfil</h3>
            <p>Actualiza tus datos sin depender del panel incrustado del shell legacy.</p>
          </div>
          <div className="page-module-actions">
            <span className={`pill ${initialProfile.isSuperAdmin ? "pill-ok" : "pill-warn"}`}>
              {initialProfile.isSuperAdmin ? "Super Admin" : initialProfile.role}
            </span>
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
          <article className="record-card">
            <div className="record-card-head">
              <div>
                <h4>Contexto de sesión</h4>
                <p>Datos no editables del perfil actual.</p>
              </div>
            </div>
            <div className="record-card-body">
              <div className="status-stack">
                <span className="pill pill-info">Organización #{initialProfile.organizationId}</span>
                <span className="pill pill-ok">Usuario #{initialProfile.id}</span>
              </div>
            </div>
          </article>
          <label className="field field-span-2">
            <span>Foto / avatar base64</span>
            <textarea
              className="input textarea-control"
              rows={4}
              value={form.photoBase64}
              onChange={(e) => setForm((c) => ({ ...c, photoBase64: e.target.value }))}
              placeholder="Data URL base64 opcional"
            />
          </label>
        </div>

        <div className="page-module-actions">
          <button className="btn primary" type="button" onClick={() => void handleSave()} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
        {statusMessage ? <p className="connection-status-note">{statusMessage}</p> : null}
      </section>
    </section>
  );
}
