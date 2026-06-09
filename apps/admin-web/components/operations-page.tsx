"use client";

import { useState } from "react";

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
import { BooleanChoice } from "./ui/boolean-choice";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

function operationTone(row: AdminWebOperationsListDto["items"][number]): "success" | "error" | "warning" {
  if (row.alegraStatus === "facturado") return "success";
  if (row.errorMessage) return "error";
  return "warning";
}

function operationLabel(row: AdminWebOperationsListDto["items"][number]) {
  if (row.alegraStatus === "facturado") return "Facturado";
  if (row.errorMessage) return "Falló";
  return "Pendiente";
}

export function OperationsPage({ result }: { result: AdminWebOperationsListDto }) {
  const [rows, setRows] = useState(result);
  const [query, setQuery] = useState("");
  const [statusView, setStatusView] = useState<"" | "invoiced" | "failed" | "pending">("");
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
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

  const filteredRows = rows.items.filter((row) => {
    const haystack = [
      row.orderNumber,
      row.customer,
      row.customerEmail,
      row.products,
      row.invoiceNumber,
      row.errorMessage,
      row.alegraStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus =
      statusView === ""
        ? true
        : statusView === "invoiced"
          ? row.alegraStatus === "facturado"
          : statusView === "failed"
            ? Boolean(row.errorMessage)
            : row.alegraStatus !== "facturado" && !row.errorMessage;

    return matchesQuery && matchesStatus;
  });

  async function refreshRows() {
    setRefreshing(true);
    try {
      const next = await getOperationsCatalog();
      setRows(next);
    } finally {
      setRefreshing(false);
    }
  }

  function setSuccess(text: string) {
    setMessage({ tone: "info", text });
  }

  function setFailure(error: unknown, fallback: string) {
    setMessage({ tone: "error", text: error instanceof Error ? error.message : fallback });
  }

  async function runOperationTask(actionKey: string, task: () => Promise<string>, fallback: string) {
    setBusyAction(actionKey);
    try {
      const text = await task();
      setSuccess(text);
    } catch (error) {
      setFailure(error, fallback);
    } finally {
      setBusyAction(null);
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
      setEinvoiceModal((current) => (current ? { ...current, saving: false, status: "Guardado." } : current));
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
        subtitle="Ejecución operativa Shopify ↔ Alegra."
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
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar operación, cliente o factura..."
              aria-label="Buscar operación"
            />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">Todas · {rows.items.length}</span>
            <span className="pill">Facturadas · {rows.summary.invoicedCount}</span>
            <span className="pill">Fallidas · {rows.summary.failedCount}</span>
            <span className="pill">E-factura pendiente · {rows.summary.einvoicePendingCount}</span>
          </>
        }
        views={
          <>
            <button
              className={statusView === "" ? "pill pill-info" : "pill"}
              type="button"
              onClick={() => setStatusView("")}
            >
              Todas
            </button>
            <button
              className={statusView === "invoiced" ? "pill pill-info" : "pill"}
              type="button"
              onClick={() => setStatusView("invoiced")}
            >
              Facturadas
            </button>
            <button
              className={statusView === "failed" ? "pill pill-info" : "pill"}
              type="button"
              onClick={() => setStatusView("failed")}
            >
              Fallidas
            </button>
            <button
              className={statusView === "pending" ? "pill pill-info" : "pill"}
              type="button"
              onClick={() => setStatusView("pending")}
            >
              Pendientes
            </button>
          </>
        }
        actions={
          <button
            className="btn primary btn-compact"
            type="button"
            onClick={() =>
              void refreshRows()
                .then(() => setSuccess("Operaciones recargadas."))
                .catch((error) => setFailure(error, "No se pudo recargar la tabla."))
            }
            disabled={refreshing}
          >
            {refreshing ? "Refrescando..." : "Refrescar"}
          </button>
        }
      />

      {message ? (
        <p className={`connection-inline-note${message.tone === "error" ? " connection-inline-note-error" : ""}`}>
          {message.text}
        </p>
      ) : null}

      <section className="metrics-kpis metrics-kpis-tight metrics-kpis-compact">
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Items</p>
          <strong>{rows.items.length}</strong>
          <span className="stat-note">Últimos 7 días por defecto</span>
        </article>
        <article className="metrics-kpi metrics-kpi-success">
          <p className="stat-label">Facturadas</p>
          <strong>{rows.summary.invoicedCount}</strong>
          <span className="stat-note">Con vínculo contable y e-factura</span>
        </article>
        <article className="metrics-kpi metrics-kpi-danger">
          <p className="stat-label">Con error</p>
          <strong>{rows.summary.failedCount}</strong>
          <span className="stat-note">Pendientes de reintento</span>
        </article>
        <article className="metrics-kpi metrics-kpi-warning">
          <p className="stat-label">E-factura pendiente</p>
          <strong>{rows.summary.einvoicePendingCount}</strong>
          <span className="stat-note">Datos fiscales por completar</span>
        </article>
      </section>

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>Mesa operativa</strong>
            <span>{filteredRows.length} operaciones visibles para facturar, sincronizar, cobrar o anular.</span>
          </div>
          <div className="page-module-actions">
            <span className="pill">Vista {statusView || "Todas"}</span>
            <span className="pill">Resultados {filteredRows.length}</span>
          </div>
        </div>
        <p className="connection-inline-note">
          Atiende primero errores y e-factura pendiente; después sincroniza, factura o emite el cobro según el caso.
        </p>

        <DataTable
          columns={[
            {
              key: "orderNumber",
              header: "Pedido",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.orderNumber}</strong>
                  <span>{row.processedAt ? new Date(row.processedAt).toLocaleString("es-CO") : "Sin fecha"}</span>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.customer}</strong>
                  <span>{row.customerEmail || "Sin email"}</span>
                </div>
              ),
            },
            {
              key: "products",
              header: "Productos",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.products}</strong>
                  <span>{row.errorMessage || "Sin error reportado"}</span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => (
                <div className="status-stack">
                  <StatusPill tone={operationTone(row)} small>
                    {operationLabel(row)}
                  </StatusPill>
                  {row.einvoiceRequested ? <span className="pill pill-sm">E-factura solicitada</span> : null}
                </div>
              ),
            },
            {
              key: "invoice",
              header: "Factura",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.invoiceNumber || "—"}</strong>
                  <span>{row.invoiceId || "Sin vincular"}</span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="table-actions">
                  {row.alegraStatus !== "facturado" ? (
                    <button
                      className="btn primary btn-compact"
                      type="button"
                      disabled={busyAction !== null || !row.actionability.retryInvoice.enabled}
                      title={row.actionability.retryInvoice.reason}
                      onClick={() =>
                        void runOperationTask(
                          `invoice:${row.id}`,
                          async () => {
                            const response = await retryOperationInvoice(row.id);
                            await refreshRows();
                            return `Factura manual para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                          },
                          "No se pudo facturar manualmente."
                        )
                      }
                    >
                      {busyAction === `invoice:${row.id}` ? "Facturando..." : "Facturar"}
                    </button>
                  ) : null}
                  <button
                    className="btn ghost btn-compact"
                    type="button"
                    disabled={busyAction !== null || !row.actionability.editEinvoice.enabled}
                    title={row.actionability.editEinvoice.reason}
                    onClick={() => openEinvoice(row.id, row.orderNumber, row.einvoiceMissing)}
                  >
                    e-Factura
                  </button>
                  <button
                    className="btn ghost btn-compact"
                    type="button"
                    disabled={busyAction !== null || !row.actionability.sync.enabled}
                    title={row.actionability.sync.reason}
                    onClick={() =>
                      void runOperationTask(
                        `sync:${row.id}`,
                        async () => {
                          const response = await syncOperation(row.id);
                          await refreshRows();
                          return `Sincronización ejecutada para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        },
                        "No se pudo ejecutar la sincronización."
                      )
                    }
                  >
                    {busyAction === `sync:${row.id}` ? "Sincronizando..." : "Sincronizar"}
                  </button>
                  <button
                    className="btn ghost btn-compact"
                    type="button"
                    disabled={busyAction !== null || !row.actionability.payment.enabled}
                    title={row.actionability.payment.reason}
                    onClick={() =>
                      void runOperationTask(
                        `payment:${row.id}`,
                        async () => {
                          const response = await emitOperationPayment(row.id);
                          await refreshRows();
                          return `Pago para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        },
                        "No se pudo emitir el pago."
                      )
                    }
                  >
                    {busyAction === `payment:${row.id}` ? "Pago..." : "Pago"}
                  </button>
                  <button
                    className="btn ghost btn-compact"
                    type="button"
                    disabled={busyAction !== null || !row.actionability.cancel.enabled}
                    title={row.actionability.cancel.reason}
                    onClick={() => {
                      if (!window.confirm(`¿Anular la factura de ${row.orderNumber}?`)) return;
                      void runOperationTask(
                        `cancel:${row.id}`,
                        async () => {
                          const response = await cancelOperationInvoice(row.id);
                          await refreshRows();
                          return `Anulación para ${row.orderNumber}: ${String(response.status || "ok")}.`;
                        },
                        "No se pudo anular la factura."
                      );
                    }}
                  >
                    {busyAction === `cancel:${row.id}` ? "Anulando..." : "Anular"}
                  </button>
                </div>
              ),
            },
          ]}
          rows={filteredRows}
          getRowKey={(row) => row.id}
        />
      </section>

      {einvoiceModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEinvoiceModal(null)}>
          <div
            className="modal-card modal-card-wide"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">E-Factura</p>
                <h3>Pedido {einvoiceModal.orderNumber}</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={() => setEinvoiceModal(null)}>
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
                <BooleanChoice
                  label="Solicitar e-factura"
                  value={einvoiceModal.draft.einvoiceRequested ?? false}
                  disabled={einvoiceModal.loading || einvoiceModal.saving}
                  onChange={(next) =>
                    setEinvoiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              einvoiceRequested: next,
                            },
                          }
                        : current
                    )
                  }
                  positive="Sí"
                  negative="No"
                  help="Activa la emisión electrónica para este pedido cuando el cliente la haya solicitado."
                />
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
                <span>
                  {einvoiceModal.einvoiceEnabled
                    ? "La e-factura está habilitada globalmente."
                    : "La e-factura sigue deshabilitada globalmente."}
                </span>
                <button
                  className="btn primary btn-compact"
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
