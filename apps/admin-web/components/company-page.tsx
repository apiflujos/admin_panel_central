"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminWebCompanyProfile } from "../lib/api";
import { saveCompanyProfile } from "../lib/api";
import { PageHeader } from "./ui/page-header";

export function CompanyPage({ initialCompany }: { initialCompany: AdminWebCompanyProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState(initialCompany);

  function updateField<K extends keyof AdminWebCompanyProfile>(key: K, value: AdminWebCompanyProfile[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setStatusMessage("");
    try {
      await saveCompanyProfile(form);
      setStatusMessage("Empresa actualizada correctamente.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la empresa.");
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Empresa"
        subtitle="Perfil maestro y branding secundario del cliente dentro de la superficie principal."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Empresa</span>
          </>
        }
        actions={
          <a className="btn ghost" href="/legacy/settings">
            Configuración avanzada
          </a>
        }
      />

      <section className="metrics-kpis-tight">
        <article className="metric-card metric-card-violet">
          <span className="metric-label">Nombre comercial</span>
          <strong className="metric-value">{form.name || "Sin nombre"}</strong>
          <span className="metric-note">Identidad visible en la operación</span>
        </article>
        <article className="metric-card metric-card-mint">
          <span className="metric-label">Contacto</span>
          <strong className="metric-value">{form.phone || "Pendiente"}</strong>
          <span className="metric-note">Teléfono principal registrado</span>
        </article>
        <article className="metric-card metric-card-amber">
          <span className="metric-label">Branding</span>
          <strong className="metric-value">{form.logoBase64 ? "Listo" : "Pendiente"}</strong>
          <span className="metric-note">Logo secundario del cliente</span>
        </article>
      </section>

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>Perfil principal</h3>
            <p>Datos base de la empresa y branding secundario del cliente.</p>
          </div>
          <div className="page-module-actions">
            <span className="pill pill-info">Gestión directa</span>
          </div>
        </div>

        <div className="settings-grid">
          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Nombre de la empresa"
            />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input
              className="input"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+57..."
            />
          </label>
          <label className="field field-span-2">
            <span>Dirección</span>
            <input
              className="input"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="Dirección"
            />
          </label>
          <article className="record-card">
            <div className="record-card-head">
              <div>
                <h4>Checklist mínimo</h4>
                <p>Paridad básica del perfil empresarial.</p>
              </div>
            </div>
            <div className="record-card-body">
              <div className="status-stack">
                <span className={`pill ${form.name ? "pill-ok" : "pill-warn"}`}>Nombre</span>
                <span className={`pill ${form.phone ? "pill-ok" : "pill-warn"}`}>Teléfono</span>
                <span className={`pill ${form.address ? "pill-ok" : "pill-warn"}`}>Dirección</span>
              </div>
            </div>
          </article>
          <label className="field field-span-2">
            <span>Logo cliente</span>
            <textarea
              className="input textarea-control"
              value={form.logoBase64}
              onChange={(event) => updateField("logoBase64", event.target.value)}
              placeholder="Data URL base64 del logo"
              rows={4}
            />
          </label>
        </div>

        <div className="page-module-actions">
          <button className="btn primary" type="button" onClick={() => void handleSave()} disabled={isPending}>
            Guardar empresa
          </button>
        </div>
        {statusMessage ? <p className="connection-status-note">{statusMessage}</p> : null}
      </section>
    </section>
  );
}
