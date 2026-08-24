"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import {
  resumirRevision,
  revisarConfiguracionObligatoria,
  type RequisitoFaltante,
} from "../../../packages/shared/src/configuracion-obligatoria";

/**
 * «Lo que hace falta para facturar».
 *
 * Esta comprobación ya existía dentro del motor, pero sólo se ejecutaba al
 * emitir la factura y su resultado moría en el registro con un código crudo:
 * «Missing invoice settings · { missing: ["resolution_id"] }», 278 veces. Lo
 * obligatorio se descubría cuando ya se había perdido la venta.
 *
 * Aquí se dice ANTES, con la MISMA regla que usa el motor —importada, no
 * copiada— para que las dos no puedan discrepar.
 */
export function ConfiguracionObligatoriaPanel({ workspace }: { workspace: ConnectionsWorkspace }) {
  const porTienda = useMemo(
    () =>
      (workspace.storeConfigs || []).map((config) => {
        const invoice = (config.invoice || {}) as Record<string, unknown>;
        return {
          storeId: config.storeId,
          nombre: config.storeName || config.shopDomain || "Tienda",
          revision: revisarConfiguracionObligatoria({
            // El motor apaga generateInvoice cuando el modo de esta tienda no
            // es "invoice". La pantalla debe evaluar exactamente ese estado.
            generateInvoice: config.sync.orders.shopifyToAlegra === "invoice" && Boolean(invoice.generateInvoice),
            einvoiceEnabled: Boolean(invoice.einvoiceEnabled),
            resolutionId: String(invoice.resolutionId || ""),
            warehouseId: String(invoice.warehouseId || ""),
            applyPayment: Boolean(invoice.applyPayment),
            paymentMethod: String(invoice.paymentMethod || ""),
            bankAccountId: String(invoice.bankAccountId || ""),
          }),
        };
      }),
    [workspace.storeConfigs]
  );

  if (!porTienda.length) return null;

  const hayBloqueos = porTienda.some((t) => !t.revision.listo);
  const hayIncompletos = porTienda.some((t) => t.revision.faltantes.length);

  return (
    <section className="card" aria-label="Lo que hace falta para facturar">
      <h3 className="worker-group-title">
        {hayBloqueos ? (
          <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Check size={16} strokeWidth={2} aria-hidden="true" />
        )}{" "}
        Lo que hace falta para facturar
      </h3>
      <p className="worker-group-description">
        {hayBloqueos
          ? "Falta un dato obligatorio. Sin él la factura no se puede emitir y el pedido se queda esperando."
          : hayIncompletos
            ? "Se puede facturar, pero algo quedará incompleto."
            : "No falta nada obligatorio."}
      </p>

      <ul className="obligatoria-lista">
        {porTienda.map((tienda) => (
          <li key={tienda.storeId} className={`obligatoria-tienda${tienda.revision.listo ? "" : " is-bloqueada"}`}>
            <p className="obligatoria-titulo">
              {tienda.revision.noAplica ? (
                <Info size={14} strokeWidth={2} aria-hidden="true" />
              ) : tienda.revision.listo ? (
                <Check size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {resumirRevision(tienda.revision, tienda.nombre)}
            </p>

            {tienda.revision.faltantes.length ? (
              <ul className="obligatoria-faltantes">
                {tienda.revision.faltantes.map((falta: RequisitoFaltante) => (
                  <li key={falta.codigo} className={`obligatoria-falta is-${falta.gravedad}`}>
                    <strong>{falta.que}</strong>
                    <span className="obligatoria-etiqueta">
                      {falta.gravedad === "bloquea" ? "Impide facturar" : "Queda incompleto"}
                    </span>
                    <p>{falta.porQue}</p>
                    <p className="obligatoria-arreglo">{falta.comoSeArregla}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
