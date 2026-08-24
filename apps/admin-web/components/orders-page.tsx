import { Search } from "lucide-react";

import type { AdminWebOrdersListDto } from "../../../packages/shared/src/admin-web";
import { toneForStatus } from "../lib/status";
import { DataTable } from "./ui/data-table";
import { OrderInvoiceButton } from "./order-invoice-button";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";
import { SyncOrdersButton } from "./sync-orders-button";
import { Paginacion } from "./ui/paginacion";

const PAGE_SIZE = 20;

/**
 * Cuántos artículos distintos lleva el pedido.
 *
 * El resumen viene como «3x Jabón…, 3x Blush…, …». Contar las comas da el
 * número de líneas sin tener que pintarlas todas, que es lo que hacía que un
 * pedido de veinte productos ocupara media pantalla.
 */
function resumenDeLineas(resumen: string | null | undefined) {
  const texto = String(resumen || "").trim();
  if (!texto) return "Sin productos";
  const lineas = texto.split(",").filter((t) => t.trim()).length;
  return lineas === 1 ? "1 artículo" : `${lineas} artículos`;
}

export function OrdersPage({
  result,
  query,
  offset,
}: {
  result: AdminWebOrdersListDto;
  query: string;
  offset: number;
}) {
  const enlacePagina = (nuevoOffset: number) => `/orders?query=${encodeURIComponent(query)}&offset=${nuevoOffset}`;

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
        actions={<SyncOrdersButton />}
      />

      <section className="card page-module-shell page-module-shell-compact">
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
                // El texto completo va en `title`: el resumen mide 389
                // caracteres de media y hasta 2.858, y volcarlo entero dejaba
                // tres pedidos por pantalla.
                <div className="entity-cell" title={row.products || undefined}>
                  <strong>{row.products || "—"}</strong>
                  <span>{resumenDeLineas(row.products)}</span>
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
                  shopDomain={row.shopDomain}
                  alreadyInvoiced={row.alegraStatus === "facturado" || Boolean(row.invoiceId)}
                />
              ),
            },
          ]}
          rows={result.items}
          getRowKey={(row) => row.id}
        />
        <Paginacion total={result.total} offset={offset} porPagina={PAGE_SIZE} href={enlacePagina} etiqueta="pedidos" />
      </section>
    </section>
  );
}
