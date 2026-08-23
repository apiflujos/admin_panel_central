"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CircleSlash, Minus } from "lucide-react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { fetchWorkerSettings, type WorkerSettingDto } from "../lib/api";
import {
  ETIQUETA_DIRECCION,
  construirMatriz,
  resumirMatriz,
  type DatosTienda,
  type DireccionCruce,
  type EstadoCruce,
} from "../../../packages/shared/src/matriz-automatizacion";
import { normalizeSourceOfTruth } from "../../../packages/shared/src/source-of-truth";

const ICONO: Record<EstadoCruce, typeof Check> = {
  funcionando: Check,
  apagado: CircleSlash,
  le_falta_algo: AlertTriangle,
  no_aplica: Minus,
};

const TEXTO: Record<EstadoCruce, string> = {
  funcionando: "Funcionando",
  apagado: "Apagado",
  le_falta_algo: "Le falta algo",
  no_aplica: "No aplica",
};

/**
 * Matriz TIENDA × TRABAJO.
 *
 * Un trabajo puede estar encendido y no hacer nada porque le falta algo en ESA
 * tienda; y al revés, estar todo listo y el trabajo apagado. Son cosas
 * distintas y hasta ahora se veían igual.
 *
 * Además cuenta lo que se está quedando atrás: pedidos que no se pueden
 * facturar, separados por motivo.
 */
export function MatrizAutomatizacionPanel({
  workspace,
  atascados,
}: {
  workspace: ConnectionsWorkspace;
  /** Pedidos atascados por dominio de tienda. */
  atascados?: Record<string, { sinIdentificacion: number; productoSinEnlazar: number; otros: number }>;
}) {
  const [workers, setWorkers] = useState<WorkerSettingDto[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetchWorkerSettings()
      .then((w) => vivo && setWorkers(w))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const motores = useMemo(() => Object.fromEntries((workers || []).map((w) => [w.key, w.enabled])), [workers]);

  const filas = useMemo(() => {
    const tiendas: DatosTienda[] = (workspace.storeConfigs || []).map((c) => {
      const sot = normalizeSourceOfTruth(c.sourceOfTruth);
      const dominio = c.shopDomain || "";
      const at = atascados?.[dominio] || { sinIdentificacion: 0, productoSinEnlazar: 0, otros: 0 };
      return {
        storeId: c.storeId,
        storeName: c.storeName,
        tieneShopify: Boolean(c.shopDomain),
        tieneCuentaAlegra: Boolean(c.alegraAccountId),
        facturaPedidos: c.sync?.orders?.shopifyToAlegra === "invoice",
        creaClienteEnAlegra: Boolean(c.sync?.contacts?.createInAlegra),
        tieneListaDePrecios: Boolean(c.priceLists?.generalId || c.priceLists?.wholesaleId),
        tieneBodega: Boolean(c.rules?.warehouseIds?.length || c.sync?.products?.warehouseId),
        mandaAlegraEnPrecios: sot.prices === "alegra",
        mandaAlegraEnPublicacion: sot.publication === "alegra",
        mandaAlegraEnInventario: sot.inventory === "alegra",
        pedidosAtascados: at,
      };
    });
    return construirMatriz(tiendas, motores);
  }, [workspace.storeConfigs, motores, atascados]);

  const resumen = useMemo(() => resumirMatriz(filas), [filas]);

  if (!filas.length) return null;

  return (
    <section className="card matriz" aria-label="Estado de la automatización">
      <h3 className="worker-group-title">¿Está funcionando la automatización?</h3>
      <p className="worker-group-description">
        Una fila por tienda. Un trabajo puede estar apagado —es una decisión— o faltarle algo —es un problema que
        alguien tiene que arreglar—.
      </p>

      <div className="page-toolbar-views matriz-resumen">
        <span className="pill pill-ok">Funcionando · {resumen.funcionando}</span>
        <span className="pill">Apagados · {resumen.apagados}</span>
        {resumen.conProblemas ? <span className="pill pill-warn">Les falta algo · {resumen.conProblemas}</span> : null}
        {resumen.atascados ? <span className="pill pill-bad">Pedidos atascados · {resumen.atascados}</span> : null}
      </div>

      {filas.map((fila) => (
        <article className="matriz-tienda" key={fila.storeId}>
          <h4>{fila.storeName}</h4>
          {(["shopify_a_alegra", "alegra_a_shopify"] as DireccionCruce[]).map((direccion) => {
            const delSentido = fila.cruces.filter((c) => c.direccion === direccion);
            if (!delSentido.length) return null;
            const activos = delSentido.filter((c) => c.estado === "funcionando").length;
            return (
              <div className="matriz-direccion" key={direccion}>
                <div className="matriz-direccion-cabeza">
                  <strong>{ETIQUETA_DIRECCION[direccion].corto}</strong>
                  <span>{ETIQUETA_DIRECCION[direccion].largo}</span>
                  <span className={`pill pill-sm ${activos ? "pill-ok" : ""}`}>
                    {activos ? `${activos} en marcha` : "nada en marcha"}
                  </span>
                </div>
                <div className="matriz-cruces">
                  {delSentido.map((c) => {
                    const Icono = ICONO[c.estado];
                    return (
                      <div className={`matriz-cruce is-${c.estado}`} key={c.workerKey}>
                        <div className="matriz-cruce-cabeza">
                          <Icono size={14} strokeWidth={2} aria-hidden="true" />
                          <strong>{c.workerLabel}</strong>
                          <span className="matriz-estado">{TEXTO[c.estado]}</span>
                        </div>
                        {c.faltantes.map((f) => (
                          <p className="matriz-falta" key={f}>
                            {f}
                          </p>
                        ))}
                        {c.notas.map((n) => (
                          <p className="matriz-nota" key={n}>
                            {n}
                          </p>
                        ))}
                        {c.atascados ? (
                          <p className="matriz-atasco">
                            <strong>{c.atascados.cantidad} pedidos sin facturar:</strong> {c.atascados.detalle}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </article>
      ))}
    </section>
  );
}
