"use client";

import { useState } from "react";

import type { AdminWebInvoiceRowDto, AdminWebInvoicesListDto } from "../../../packages/shared/src/admin-web";
import { getInvoicesCatalog } from "../lib/api";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

function normalizeInvoiceStatus(status: string | null) {
  if (!status) return "Sin estado";
  if (status === "paid") return "Pagada";
  if (status === "draft") return "Borrador";
  if (status === "open") return "Abierta";
  if (status === "void") return "Anulada";
  return status;
}

function invoiceTone(status: string | null): "success" | "warning" | "info" {
  if (status === "paid") return "success";
  if (!status) return "info";
  return "warning";
}

function invoiceMatchesStatus(row: AdminWebInvoiceRowDto, view: string) {
  if (view === "paid") return row.status === "paid";
  if (view === "pending") return row.status !== "paid";
  return true;
}

export function InvoicesPage({ result }: { result: AdminWebInvoicesListDto }) {
  const [rows, setRows] = useState(result);
  const [query, setQuery] = useState("");
  const [statusView, setStatusView] = useState<"" | "paid" | "pending">("");
  const [message, setMessage] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredRows = rows.items.filter((item) => {
    const haystack = [item.invoiceNumber, item.invoiceId, item.customer, item.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query.trim().toLowerCase()) && invoiceMatchesStatus(item, statusView);
  });

  const paidCount = rows.items.filter((item) => item.status === "paid").length;
  const pendingCount = rows.items.length - paidCount;
  const renderedTotal = filteredRows.reduce((acc, item) => acc + (item.total ?? 0), 0);

  async function refreshRows() {
    setRefreshing(true);
    try {
      const next = await getInvoicesCatalog();
      setRows(next);
      setMessage("Facturas recargadas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron recargar las facturas.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Facturas"
        subtitle="Facturación, estado documental y descarga de soporte."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Facturas</span>
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
              placeholder="Buscar factura, cliente o estado..."
              aria-label="Buscar factura"
            />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">Todas · {rows.total}</span>
            <span className="pill">Pagadas · {paidCount}</span>
            <span className="pill">Pendientes · {pendingCount}</span>
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
              className={statusView === "paid" ? "pill pill-info" : "pill"}
              type="button"
              onClick={() => setStatusView("paid")}
            >
              Pagadas
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
          <button className="btn primary btn-compact" type="button" onClick={refreshRows} disabled={refreshing}>
            {refreshing ? "Refrescando..." : "Refrescar"}
          </button>
        }
      />

      {message ? <p className="connection-inline-note">{message}</p> : null}

      <section className="metrics-kpis metrics-kpis-tight metrics-kpis-compact">
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Total facturas</p>
          <strong>{rows.total}</strong>
          <span className="stat-note">Con `alegra_invoice_id` resuelto</span>
        </article>
        <article className="metrics-kpi metrics-kpi-success">
          <p className="stat-label">Pagadas</p>
          <strong>{paidCount}</strong>
          <span className="stat-note">Cierre financiero confirmado</span>
        </article>
        <article className="metrics-kpi metrics-kpi-warning">
          <p className="stat-label">Pendientes</p>
          <strong>{pendingCount}</strong>
          <span className="stat-note">Requieren seguimiento</span>
        </article>
        <article className="metrics-kpi metrics-kpi-primary">
          <p className="stat-label">Monto visible</p>
          <strong>{renderedTotal.toLocaleString("es-CO")}</strong>
          <span className="stat-note">Solo sobre la vista actual</span>
        </article>
      </section>

      <section className="card page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <strong>Libro documental</strong>
            <span>{filteredRows.length} facturas visibles para seguimiento, descarga y conciliación rápida.</span>
          </div>
          <div className="page-module-actions">
            <span className="pill">Vista {statusView || "Todas"}</span>
            <span className="pill">Resultados {filteredRows.length}</span>
          </div>
        </div>
        <p className="connection-inline-note">
          Usa la vista pendiente para conciliación rápida y descarga de PDF solo cuando el documento ya esté confirmado.
        </p>

        <DataTable
          columns={[
            {
              key: "invoiceNumber",
              header: "Factura",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.invoiceNumber || row.invoiceId || "—"}</strong>
                  <span>{row.currency || "COP"}</span>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => (
                <div className="entity-cell">
                  <strong>{row.customer}</strong>
                  <span>{row.invoiceId}</span>
                </div>
              ),
            },
            {
              key: "total",
              header: "Total",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.total != null ? row.total.toLocaleString("es-CO") : "—"}</strong>
                  <span>{row.currency || "COP"}</span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => (
                <StatusPill tone={invoiceTone(row.status)} small>
                  {normalizeInvoiceStatus(row.status)}
                </StatusPill>
              ),
            },
            {
              key: "processedAt",
              header: "Fecha",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.processedAt ? new Date(row.processedAt).toLocaleDateString("es-CO") : "—"}</strong>
                  <span>{row.processedAt ? new Date(row.processedAt).toLocaleTimeString("es-CO") : "Sin hora"}</span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) =>
                row.invoiceId ? (
                  <a
                    className="btn ghost btn-compact"
                    href={`/api/invoices/${encodeURIComponent(row.invoiceId)}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={filteredRows}
          getRowKey={(row) => row.id}
        />
      </section>
    </section>
  );
}
