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
      setStatusMessage("Perfil actualizado.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Perfil"
        subtitle="Identidad y contacto."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Perfil</span>
          </>
        }
        actions={
          <>
            <span className={`pill ${initialProfile.isSuperAdmin ? "pill-ok" : "pill-warn"}`}>
              {initialProfile.isSuperAdmin ? "Super Admin" : initialProfile.role}
            </span>
            <a className="btn ghost" href="/">
              Volver al inicio
            </a>
          </>
        }
      />

      <section className="page-module-shell">
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
