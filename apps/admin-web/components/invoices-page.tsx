"use client";

import { useState, useTransition } from "react";

import type { AdminWebInvoicesListDto } from "../../../packages/shared/src/admin-web";
import { getInvoicesCatalog } from "../lib/api";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function InvoicesPage({ result }: { result: AdminWebInvoicesListDto }) {
  const [rows, setRows] = useState(result);
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const paidCount = rows.items.filter((item) => item.status === "paid").length;
  const pendingCount = rows.items.length - paidCount;

  function refreshRows() {
    startTransition(() => {
      void getInvoicesCatalog()
        .then((next) => {
          setRows(next);
          setMessage("Facturas recargadas.");
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "No se pudieron recargar las facturas.");
        });
    });
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Facturas"
        subtitle="Facturacion y estado documental."
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
            <input className="input-control" type="search" placeholder="Buscar factura, pedido o cliente..." aria-label="Buscar factura" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              Todas · {rows.total}
            </span>
            <span className="pill">
              Pagadas · {paidCount}
            </span>
            <span className="pill">
              Pendientes · {pendingCount}
            </span>
          </>
        }
        actions={
          <>
            <button
              className="btn btn-primary btn-compact"
              type="button"
              onClick={refreshRows}
              disabled={pending}
            >
              {pending ? "Refrescando..." : "Refrescar"}
            </button>
          </>
        }
      />

      {message ? <p className="connection-inline-note">{message}</p> : null}

      <section className="stats-grid">
        <article className="card stat-card">
          <p className="stat-label">Total facturas</p>
          <strong>{rows.total}</strong>
          <span className="stat-note">Con `alegra_invoice_id` resuelto</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Renderizadas</p>
          <strong>{rows.items.length}</strong>
          <span className="stat-note">Limite {rows.limit}</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Pagadas</p>
          <strong>{paidCount}</strong>
          <span className="stat-note">Estado financiero normalizado</span>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Facturas listas para seguimiento en el nuevo panel</div>
        <DataTable
          columns={[
            {
              key: "invoiceNumber",
              header: "Factura",
              render: (row) => row.invoiceNumber || row.invoiceId || "—",
            },
            {
              key: "customer",
              header: "Cliente",
              render: (row) => row.customer,
            },
            {
              key: "total",
              header: "Total",
              render: (row) => (row.total != null ? row.total.toLocaleString("es-CO") : "—"),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) =>
                row.status === "paid" ? (
                  <StatusPill tone="success" small>
                    Paid
                  </StatusPill>
                ) : row.status ? (
                  <StatusPill tone="warning" small>
                    {row.status}
                  </StatusPill>
                ) : (
                  <StatusPill tone="info" small>
                    —
                  </StatusPill>
                ),
            },
            {
              key: "processedAt",
              header: "Fecha",
              render: (row) => (row.processedAt ? row.processedAt.slice(0, 16).replace("T", " ") : "—"),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) =>
                row.invoiceId ? (
                  <a className="btn btn-ghost btn-compact" href={`/api/invoices/${encodeURIComponent(row.invoiceId)}/pdf`} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={rows.items}
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
