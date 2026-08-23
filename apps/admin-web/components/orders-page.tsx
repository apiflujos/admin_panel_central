import { Search } from "lucide-react";

import type { AdminWebOrdersListDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { DataTable } from "./ui/data-table";
import { OrderInvoiceButton } from "./order-invoice-button";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";
import { SyncOrdersButton } from "./sync-orders-button";

const PAGE_SIZE = 20;

export function OrdersPage({
  result,
  query,
  offset,
}: {
  result: AdminWebOrdersListDto;
  query: string;
  offset: number;
}) {
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasNext = nextOffset < result.total;
  const hasPrev = offset > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Pedidos"
        subtitle="Pedidos y facturación."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Pedidos</span>
          </>
        }
      />

      <PageToolbar
        search={
          <form method="get">
            <div className="input-with-icon">
              <span className="input-icon" aria-hidden="true">
                <Search size={14} strokeWidth={1.75} />
              </span>
              <input
                className="input"
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar pedido, cliente o email..."
                aria-label="Buscar pedido"
              />
            </div>
          </form>
        }
        views={
          <>
            <span className="pill pill-info">Todos · {result.total}</span>
            <span className="pill">Facturados · {result.summary.invoicedCount}</span>
            <span className="pill">Pendientes · {result.summary.pendingCount}</span>
            <span className="pill">E-invoice pend. · {result.summary.einvoicePendingCount}</span>
          </>
        }
        actions={
          <>
            <SyncOrdersButton />
            {hasPrev && (
              <a
                className="btn ghost btn-compact"
                href={`/orders?query=${encodeURIComponent(query)}&offset=${prevOffset}`}
              >
                Anterior
              </a>
            )}
            {hasNext && (
              <a
                className="btn primary btn-compact"
                href={`/orders?query=${encodeURIComponent(query)}&offset=${nextOffset}`}
              >
                Siguiente
              </a>
            )}
          </>
        }
      />

      <section className="card page-module-shell page-module-shell-compact">
        <p className="connection-inline-note">
          Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, result.total)} de {result.total} · Página{" "}
          {Math.floor(offset / PAGE_SIZE) + 1}
        </p>
        <DataTable
          columns={[
            {
              key: "orderNumber",
              header: "Pedido",
              render: (row) => (
                <div className="entity-cell">
                  <strong>#{row.orderNumber}</strong>
                  <span>{row.processedAt ? new Date(row.processedAt).toLocaleString("es-CO") : "Sin fecha"}</span>
                </div>
              ),
            },
            {
              key: "storeName",
              header: "Tienda",
              render: (row) => (
                <StatusPill tone="info" small>
                  {row.storeName || "—"}
                </StatusPill>
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
                  <span>{row.shopifyId ? `Shopify ${row.shopifyId}` : "Sin id Shopify"}</span>
                </div>
              ),
            },
            {
              key: "total",
              header: "Total",
              render: (row) => (
                <strong>
                  {typeof row.total === "number"
                    ? row.total.toLocaleString("es-CO", {
                        style: "currency",
                        currency: row.currency || "COP",
                        maximumFractionDigits: 0,
                      })
                    : "—"}
                </strong>
              ),
            },
            {
              key: "alegraStatus",
              header: "Estado",
              render: (row) => (
                <div className="status-stack">
                  {row.bloqueo ? (
                    <StatusPill tone="error" small>
                      No se puede facturar
                    </StatusPill>
                  ) : (
                    <StatusPill tone={toneForStatus(row.alegraStatus)} small>
                      {row.alegraStatus}
                    </StatusPill>
                  )}
                  {row.einvoiceRequested ? <span className="pill pill-sm">E-invoice solicitada</span> : null}
                  {/* El motivo va EN EL PEDIDO, que es donde lo busca quien
                      tiene que arreglarlo: si sólo dijera "pendiente", nadie
                      sabría que falta la cédula del cliente. */}
                  {row.bloqueo
                    ? row.bloqueo.motivos.map((b) => (
                        <span className="pedido-bloqueo" key={b.motivo}>
                          <strong>{b.motivo}</strong>
                          {b.comoSeArregla ? <em>{b.comoSeArregla}</em> : null}
                        </span>
                      ))
                    : null}
                </div>
              ),
            },
            {
              key: "invoiceNumber",
              header: "Factura",
              render: (row) => (
                <div className="entity-cell entity-cell-compact">
                  <strong>{row.invoiceNumber || "—"}</strong>
                  <span>{row.invoiceId ? `Alegra ${row.invoiceId}` : "Sin vincular"}</span>
                </div>
              ),
            },
            {
              key: "acciones",
              header: "Acciones",
              render: (row) => (
                <OrderInvoiceButton
                  orderId={row.shopifyId}
                  alreadyInvoiced={row.alegraStatus === "facturado" || Boolean(row.invoiceId)}
                />
              ),
            },
          ]}
          rows={result.items}
          getRowKey={(row) => row.id}
        />
      </section>
    </section>
  );
}
