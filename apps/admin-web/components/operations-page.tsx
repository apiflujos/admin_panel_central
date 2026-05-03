"use client";

import { useState, useTransition } from "react";

import type { AdminWebOperationsListDto } from "../../../packages/shared/src/admin-web";
import {
  cancelOperationInvoice,
  emitOperationPayment,
  getEinvoiceOverride,
  getOperationsCatalog,
  retryOperationInvoice,
  saveEinvoiceOverride,
  syncOperation,
  type AdminWebEinvoiceOverride,
} from "../lib/api";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function OperationsPage({ result }: { result: AdminWebOperationsListDto }) {
  const [rows, setRows] = useState(result);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [pendingAction, startTransition] = useTransition();
  const [einvoiceModal, setEinvoiceModal] = useState<{
    orderId: string;
    orderNumber: string;
    missing: string[];
    draft: AdminWebEinvoiceOverride;
    einvoiceEnabled: boolean;
    loading: boolean;
    saving: boolean;
    status: string;
  } | null>(null);

  async function refreshRows() {
    const next = await getOperationsCatalog();
    setRows(next);
  }

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  function setSuccess(text: string) {
    setMessage({ tone: "info", text });
  }

  function setFailure(error: unknown, fallback: string) {
    setMessage({ tone: "error", text: error instanceof Error ? error.message : fallback });
  }

  async function runOperationTask(task: () => Promise<string>, fallback: string) {
    try {
      const text = await task();
      setSuccess(text);
    } catch (error) {
      setFailure(error, fallback);
    }
  }

  function openEinvoice(orderId: string, orderNumber: string, missing: string[]) {
    setEinvoiceModal({
      orderId,
      orderNumber,
      missing,
      draft: { orderId, einvoiceRequested: false },
      einvoiceEnabled: false,
      loading: true,
      saving: false,
      status: "Cargando...",
    });
    void getEinvoiceOverride(orderId)
      .then((response) => {
        setEinvoiceModal((current) =>
          current && current.orderId === orderId
            ? {
                ...current,
                draft: { orderId, ...(response.override || {}) },
                einvoiceEnabled: response.einvoiceEnabled,
                loading: false,
                status: response.einvoiceEnabled
                  ? "E-factura habilitada en configuración."
                  : "E-factura desactivada en configuración.",
              }
            : current
        );
      })
      .catch((error) => {
        setEinvoiceModal((current) =>
          current && current.orderId === orderId
            ? {
                ...current,
                loading: false,
                status: error instanceof Error ? error.message : "No se pudo cargar la e-factura.",
              }
            : current
        );
      });
  }

  async function saveCurrentEinvoice() {
    if (!einvoiceModal) return;
    setEinvoiceModal((current) => (current ? { ...current, saving: true, status: "Guardando..." } : current));
    try {
      await saveEinvoiceOverride(einvoiceModal.orderId, einvoiceModal.draft);
      await refreshRows();
      setEinvoiceModal((current) =>
        current ? { ...current, saving: false, status: "Guardado." } : current
      );
      setSuccess(`Override de e-factura guardado para ${einvoiceModal.orderNumber}.`);
    } catch (error) {
      setEinvoiceModal((current) =>
        current
          ? {
              ...current,
              saving: false,
              status: error instanceof Error ? error.message : "No se pudo guardar la e-factura.",
            }
          : current
      );
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Operaciones"
        subtitle="Ejecucion operativa Shopify ↔ Alegra."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Operaciones</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" placeholder="Buscar operación o cliente..." aria-label="Buscar operación" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Todas · {rows.items.length}
            </span>
            <span className="pill">
              Facturadas · {rows.summary.invoicedCount}
            </span>
            <span className="pill">
              Fallidas · {rows.summary.failedCount}
            </span>
          </>
        }
        actions={
          <>
            <button
              className="btn btn-primary btn-compact"
              type="button"
              onClick={() =>
                runAction(async () => {
                  await refreshRows();
                  setSuccess("Operaciones recargadas.");
                })
              }
              disabled={pendingAction}
            >
              {pendingAction ? "Refrescando..." : "Refrescar"}
            </button>
          </>
        }
      />

      {message ? (
        <p className={`connection-inline-note${message.tone === "error" ? " connection-inline-note-error" : ""}`}>
          {message.text}
        </p>
      ) : null}

      <section className="stats-grid">
        <article className="card stat-card">
          <p className="stat-label">Items</p>
          <strong>{rows.items.length}</strong>
          <span className="stat-note">Últimos 7 días por defecto</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Facturadas</p>
          <strong>{rows.summary.invoicedCount}</strong>
          <span className="stat-note">Con mapping/invoice</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Con error</p>
          <strong>{rows.summary.failedCount}</strong>
          <span className="stat-note">Pendientes de reintento</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Operaciones listas para seguimiento en el nuevo panel</div>
        <DataTable
          columns={[
            {
              key: "orderNumber",
              header: "Pedido",
              render: (row) => row.orderNumber,
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => row.customer,
            },
            {
              key: "products",
              header: "Productos",
              render: (row) => row.products,
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.alegraStatus === "facturado" ? (
                  <StatusPill tone="success" small>
                    Facturado
                  </StatusPill>
                ) : row.errorMessage ? (
                  <StatusPill tone="error" small>
                    Falló
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" small>
                    Pendiente
                  </StatusPill>
                ),
            },
            {
              key: "invoice",
              header: "Factura",
              render: (row) => row.invoiceNumber || "—",
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  {row.alegraStatus !== "facturado" ? (
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={pendingAction || !row.actionability.retryInvoice.enabled}
                      title={row.actionability.retryInvoice.reason}
                      onClick={() =>
                        runAction(() =>
                          runOperationTask(async () => {
                            const response = await retryOperationInvoice(row.id);
                            await refreshRows();
                            return `Factura manual para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                          }, "No se pudo facturar manualmente.")
                        )
                      }
                    >
                      Facturar
                    </button>
                  ) : null}
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={pendingAction || !row.actionability.editEinvoice.enabled}
                    title={row.actionability.editEinvoice.reason}
                    onClick={() => openEinvoice(row.id, row.orderNumber, row.einvoiceMissing)}
                  >
                    e-Factura
                  </button>
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={pendingAction || !row.actionability.sync.enabled}
                    title={row.actionability.sync.reason}
                    onClick={() =>
                      runAction(() =>
                        runOperationTask(async () => {
                          const response = await syncOperation(row.id);
                          await refreshRows();
                          return `Sync ejecutado para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        }, "No se pudo ejecutar el sync.")
                      )
                    }
                  >
                    Sync
                  </button>
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={pendingAction || !row.actionability.payment.enabled}
                    title={row.actionability.payment.reason}
                    onClick={() =>
                      runAction(() =>
                        runOperationTask(async () => {
                          const response = await emitOperationPayment(row.id);
                          await refreshRows();
                          return `Pago para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        }, "No se pudo emitir el pago.")
                      )
                    }
                  >
                    Pago
                  </button>
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={pendingAction || !row.actionability.cancel.enabled}
                    title={row.actionability.cancel.reason}
                    onClick={() =>
                      runAction(() =>
                        runOperationTask(async () => {
                          const response = await cancelOperationInvoice(row.id);
                          await refreshRows();
                          return `Anulación para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        }, "No se pudo anular la factura.")
                      )
                    }
                  >
                    Anular
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows.items}
          getRowKey={(row) => row.id}
        />
      </div>

      {einvoiceModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEinvoiceModal(null)}>
          <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">E-Factura</p>
                <h3>Pedido {einvoiceModal.orderNumber}</h3>
              </div>
              <button className="btn btn-ghost btn-compact" type="button" onClick={() => setEinvoiceModal(null)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <p className="connection-inline-note">{einvoiceModal.status}</p>
              {einvoiceModal.missing.length ? (
                <div className="store-readiness store-readiness-warn">
                  <div className="store-readiness-head">
                    <strong>Datos pendientes</strong>
                    <span>Guardado no equivale a listo para facturar</span>
                  </div>
                  <ul className="store-readiness-list">
                    {einvoiceModal.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="store-configs-grid">
                <label className="store-config-field">
                  <span>Solicitar e-factura</span>
                  <select
                    className="input"
                    value={einvoiceModal.draft.einvoiceRequested ? "true" : "false"}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                einvoiceRequested: event.target.value === "true",
                              },
                            }
                          : current
                      )
                    }
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label className="store-config-field">
                  <span>Razón social</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.fiscalName || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, fiscalName: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Tipo ID</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.idType || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, idType: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Número ID</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.idNumber || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, idNumber: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Email</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.email || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, email: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Teléfono</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.phone || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, phone: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Dirección</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.address || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, address: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Ciudad</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.city || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, city: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>Departamento</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.state || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, state: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>País</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.country || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, country: event.target.value } } : current
                      )
                    }
                  />
                </label>
                <label className="store-config-field">
                  <span>ZIP</span>
                  <input
                    className="input"
                    value={einvoiceModal.draft.zip || ""}
                    disabled={einvoiceModal.loading || einvoiceModal.saving}
                    onChange={(event) =>
                      setEinvoiceModal((current) =>
                        current ? { ...current, draft: { ...current.draft, zip: event.target.value } } : current
                      )
                    }
                  />
                </label>
              </div>
              <div className="connection-card-actions">
                <span>{einvoiceModal.einvoiceEnabled ? "La e-factura está habilitada globalmente." : "La e-factura sigue deshabilitada globalmente."}</span>
                <button
                  className="btn btn-primary btn-compact"
                  type="button"
                  onClick={() => void saveCurrentEinvoice()}
                  disabled={einvoiceModal.loading || einvoiceModal.saving}
                >
                  {einvoiceModal.saving ? "Guardando..." : "Guardar e-factura"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
