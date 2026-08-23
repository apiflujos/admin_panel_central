"use client";

import { AlertTriangle, Info } from "lucide-react";

import { revisarCoherencia, type ConfiguracionParaRevisar } from "../../../packages/shared/src/config-coherencia";

/**
 * Avisa cuando los ajustes de una tienda se contradicen entre sí.
 *
 * Cada opción por separado parece razonable; el daño aparece al combinarlas, y
 * eso hasta ahora sólo se descubría cuando algo fallaba en producción.
 */
export function StoreConfigCoherencia({ config }: { config: ConfiguracionParaRevisar }) {
  const avisos = revisarCoherencia(config);
  if (!avisos.length) return null;

  return (
    <section className="coherencia" aria-label="Revisión de la configuración">
      {avisos.map((a) => (
        <article className={`coherencia-item ${a.gravedad === "bloquea" ? "is-bloquea" : "is-aviso"}`} key={a.titulo}>
          <span className="coherencia-icono" aria-hidden="true">
            {a.gravedad === "bloquea" ? (
              <AlertTriangle size={15} strokeWidth={1.9} />
            ) : (
              <Info size={15} strokeWidth={1.9} />
            )}
          </span>
          <div className="coherencia-texto">
            <strong>{a.titulo}</strong>
            <p>{a.detalle}</p>
            <p className="coherencia-arreglo">{a.comoSeArregla}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
