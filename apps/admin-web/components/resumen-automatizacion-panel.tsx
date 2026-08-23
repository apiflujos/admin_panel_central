"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CircleSlash } from "lucide-react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { fetchWorkerSettings, type WorkerSettingDto } from "../lib/api";
import {
  construirResumen,
  type DatosResumen,
  type EstadoFrase,
} from "../../../packages/shared/src/resumen-automatizacion";
import { normalizeSourceOfTruth } from "../../../packages/shared/src/source-of-truth";

const ICONO: Record<EstadoFrase, typeof Check> = {
  ok: Check,
  atencion: AlertTriangle,
  no_ocurre: CircleSlash,
};

/**
 * «¿Qué va a pasar?» — lo primero que se ve al abrir Configuración.
 *
 * Junta las REGLAS (lo configurado) con los MOTORES (si el trabajo que las
 * ejecuta está encendido) y lo dice en frases. Sin esto había que cruzar dos
 * pantallas y saberse de memoria qué trabajo hace qué para responder a algo tan
 * básico como "¿qué pasa cuando entra un pedido?".
 */
export function ResumenAutomatizacionPanel({
  workspace,
  activeStoreId,
}: {
  workspace: ConnectionsWorkspace;
  activeStoreId: number | null;
}) {
  const [workers, setWorkers] = useState<WorkerSettingDto[] | null>(null);
  const [sinAcceso, setSinAcceso] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchWorkerSettings()
      .then((w) => vivo && setWorkers(w))
      // Si el usuario no puede leer los trabajos, el resumen sigue siendo útil:
      // se muestran las reglas y se avisa de que falta ese dato.
      .catch(() => vivo && setSinAcceso(true));
    return () => {
      vivo = false;
    };
  }, []);

  const config = useMemo(
    () => workspace.storeConfigs?.find((c) => c.storeId === activeStoreId) ?? null,
    [workspace.storeConfigs, activeStoreId]
  );

  const encendido = (clave: string) => (workers ? Boolean(workers.find((w) => w.key === clave)?.enabled) : true);

  const bloques = useMemo(() => {
    if (!config) return null;
    const sot = normalizeSourceOfTruth(config.sourceOfTruth);
    const modo = config.sync?.orders?.shopifyToAlegra;
    const datos: DatosResumen = {
      nombreTienda: config.storeName,
      facturaPedidos: modo === "invoice",
      soloRegistraPedidos: modo === "db_only" || modo === "contact_only",
      creaClienteEnAlegra: Boolean(config.sync?.contacts?.createInAlegra),
      mandaAlegra: {
        inventory: sot.inventory === "alegra",
        prices: sot.prices === "alegra",
        publication: sot.publication === "alegra",
      },
      sinExistenciasSeMarcaAgotado:
        (config.rules as { outOfStockBehavior?: string })?.outOfStockBehavior !== "unpublish",
      motorPedidosEncendido: encendido("webhook-dispatch"),
      motorRepasoPedidosEncendido: encendido("orders-sync"),
      motorPreciosEncendido: encendido("products-sync"),
      motorExistenciasEncendido: encendido("inventory-adjustments"),
    };
    return construirResumen(datos);
  }, [config, workers]);

  if (!config || !bloques) return null;

  return (
    <section className="card resumen-auto" aria-label="Qué va a pasar">
      <h3 className="worker-group-title">Qué va a pasar en {config.storeName}</h3>
      <p className="worker-group-description">
        Lo que de verdad ocurrirá, juntando lo configurado aquí con los trabajos que lo ejecutan.
      </p>

      {sinAcceso ? (
        <p className="connection-inline-note">
          No se pudo leer el estado de los trabajos automáticos. Lo de abajo son las reglas configuradas; para que
          ocurran, su trabajo tiene que estar encendido.
        </p>
      ) : null}

      <div className="resumen-bloques">
        {bloques.map((b) => (
          <article className="resumen-bloque" key={b.titulo}>
            <h4>{b.titulo}</h4>
            <ul>
              {b.frases.map((f) => {
                const Icono = ICONO[f.estado];
                return (
                  <li className={`resumen-frase is-${f.estado}`} key={f.texto}>
                    <Icono size={14} strokeWidth={2} aria-hidden="true" />
                    <span>
                      {f.texto}
                      {f.porque ? <em> {f.porque}</em> : null}
                      {f.accion ? (
                        <a className="resumen-accion" href={f.accion.href}>
                          {f.accion.texto}
                        </a>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
