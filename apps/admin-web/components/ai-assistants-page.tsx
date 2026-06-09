"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminWebAiAssistant } from "../lib/api";
import { createAiAssistant, deleteAiAssistant, updateAiAssistant } from "../lib/api";
import { DataTable } from "./ui/data-table";
import { BooleanChoice } from "./ui/boolean-choice";
import { PageHeader } from "./ui/page-header";
import { StatusPill } from "./ui/status-pill";

type AssistantFormState = {
  name: string;
  n8n_url: string;
  avatar_url: string;
  description: string;
  instruccion: string;
  politicas: string;
  identidad: string;
  is_active: boolean;
};

function toFormState(assistant?: AdminWebAiAssistant | null): AssistantFormState {
  return {
    name: assistant?.name || "",
    n8n_url: assistant?.n8n_url || "",
    avatar_url: assistant?.avatar_url || "",
    description: assistant?.description || "",
    instruccion: assistant?.instruccion || "",
    politicas: assistant?.politicas || "",
    identidad: assistant?.identidad || "",
    is_active: assistant?.is_active ?? true,
  };
}

export function AiAssistantsPage({ initialAssistants }: { initialAssistants: AdminWebAiAssistant[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState<AssistantFormState>(() => toFormState());

  const assistantsCount = initialAssistants.length;
  const activeCount = useMemo(
    () => initialAssistants.filter((assistant) => assistant.is_active).length,
    [initialAssistants]
  );

  function resetForm() {
    setEditingId(null);
    setForm(toFormState());
  }

  function startEdit(assistant: AdminWebAiAssistant) {
    setEditingId(assistant.id);
    setForm(toFormState(assistant));
    setStatusMessage(`Editando asistente ${assistant.name}.`);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.n8n_url.trim()) {
      setStatusMessage("Nombre y URL de n8n son obligatorios.");
      return;
    }
    setStatusMessage("");
    try {
      if (editingId) {
        await updateAiAssistant(editingId, form);
        setStatusMessage("Asistente actualizado.");
      } else {
        await createAiAssistant(form);
        setStatusMessage("Asistente creado.");
      }
      resetForm();
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar el asistente.");
    }
  }

  async function handleDelete(assistant: AdminWebAiAssistant) {
    if (!window.confirm(`Eliminar el asistente "${assistant.name}"?`)) {
      return;
    }
    setStatusMessage("");
    try {
      await deleteAiAssistant(assistant.id);
      if (editingId === assistant.id) {
        resetForm();
      }
      setStatusMessage("Asistente eliminado.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo eliminar el asistente.");
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Asistentes IA"
        subtitle="Asistentes conectados a n8n."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Asistentes IA</span>
          </>
        }
        actions={
          <>
            <span className="pill">{assistantsCount} total</span>
            <span className="pill">{activeCount} activos</span>
            <a className="btn ghost" href="/legacy/settings">
              Configuración avanzada
            </a>
          </>
        }
      />

      <section className="page-module-shell">
        <div className="page-module-head">
          <div>
            <h3>{editingId ? "Editar asistente" : "Crear asistente"}</h3>
          </div>
        </div>
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <strong>Identidad base</strong>
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
              <span>URL n8n</span>
              <input
                className="input"
                value={form.n8n_url}
                onChange={(e) => setForm((c) => ({ ...c, n8n_url: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Avatar URL</span>
              <input
                className="input"
                value={form.avatar_url}
                onChange={(e) => setForm((c) => ({ ...c, avatar_url: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              />
            </label>
            <BooleanChoice
              label="Activo"
              value={form.is_active}
              onChange={(next) => setForm((c) => ({ ...c, is_active: next }))}
              positive="Activo"
              negative="Inactivo"
              help="Disponibilidad para ejecución."
            />
          </div>
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <strong>Prompt y gobierno</strong>
          </div>
          <div className="settings-grid">
            <label className="field field-span-2">
              <span>Instrucción general</span>
              <textarea
                className="input textarea-control"
                rows={4}
                value={form.instruccion}
                onChange={(e) => setForm((c) => ({ ...c, instruccion: e.target.value }))}
              />
            </label>
            <label className="field field-span-2">
              <span>Políticas</span>
              <textarea
                className="input textarea-control"
                rows={4}
                value={form.politicas}
                onChange={(e) => setForm((c) => ({ ...c, politicas: e.target.value }))}
              />
            </label>
            <label className="field field-span-2">
              <span>Identidad</span>
              <textarea
                className="input textarea-control"
                rows={4}
                value={form.identidad}
                onChange={(e) => setForm((c) => ({ ...c, identidad: e.target.value }))}
              />
            </label>
          </div>
        </div>
        <div className="page-module-actions">
          <button className="btn primary" type="button" onClick={() => void handleSave()} disabled={isPending}>
            {editingId ? "Actualizar asistente" : "Guardar asistente"}
          </button>
          <button className="btn ghost" type="button" onClick={resetForm} disabled={isPending}>
            Limpiar
          </button>
        </div>
        {statusMessage ? <p className="connection-status-note">{statusMessage}</p> : null}
      </section>

      <section className="page-module-shell">
        <DataTable
          columns={[
            {
              key: "assistant",
              header: "Asistente",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.name}</strong>
                  <span>{row.description || "Sin descripción corta"}</span>
                </div>
              ),
            },
            {
              key: "webhook",
              header: "Webhook",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.n8n_url || "—"}</strong>
                  <span>{row.avatar_url || "Sin avatar URL"}</span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => (
                <div className="status-stack">
                  <StatusPill tone={row.is_active ? "success" : "warning"} small>
                    {row.is_active ? "Activo" : "Inactivo"}
                  </StatusPill>
                  <span>{row.created_at ? new Date(row.created_at).toLocaleDateString("es-CO") : "—"}</span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="page-module-actions">
                  <button className="btn ghost btn-compact" type="button" onClick={() => startEdit(row)}>
                    Editar
                  </button>
                  <button className="btn ghost btn-compact" type="button" onClick={() => void handleDelete(row)}>
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
          rows={initialAssistants}
          getRowKey={(row) => row.id}
          emptyState="Sin asistentes configurados."
        />
      </section>
    </section>
  );
}
