import Link from "next/link";

/**
 * Paginación ÚNICA para todas las listas.
 *
 * Antes cada pantalla la resolvía a su manera: los botones «Anterior» y
 * «Siguiente» vivían arriba en la barra de acciones, mezclados con
 * «Sincronizar», y el «Mostrando 1–20 de 340» aparecía como una nota suelta
 * dentro de la tarjeta. No se decía cuántas páginas había ni en cuál estabas
 * respecto al total, así que era imposible saber si faltaban dos o doscientas.
 *
 * Aquí van juntos y en el mismo sitio en toda la aplicación: debajo de la
 * tabla, que es donde se busca después de leerla.
 */
export function Paginacion({
  total,
  offset,
  porPagina,
  href,
  etiqueta = "resultados",
}: {
  total: number;
  offset: number;
  porPagina: number;
  /** Construye el enlace para un desplazamiento dado, conservando los filtros. */
  href: (offset: number) => string;
  /** Qué se está listando: «pedidos», «productos»… */
  etiqueta?: string;
}) {
  if (total <= 0) return null;

  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginas, Math.floor(offset / porPagina) + 1);
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = Math.min(offset + porPagina, total);
  const hayAnterior = offset > 0;
  const haySiguiente = offset + porPagina < total;

  return (
    <nav className="paginacion" aria-label={`Paginación de ${etiqueta}`}>
      <p className="paginacion-cuenta">
        <strong>
          {desde.toLocaleString("es-CO")}–{hasta.toLocaleString("es-CO")}
        </strong>{" "}
        de {total.toLocaleString("es-CO")} {etiqueta}
      </p>

      <div className="paginacion-controles">
        {hayAnterior ? (
          <Link className="btn ghost btn-compact" href={href(Math.max(0, offset - porPagina))} rel="prev">
            Anterior
          </Link>
        ) : (
          <span className="btn ghost btn-compact is-inerte" aria-disabled="true">
            Anterior
          </span>
        )}

        <span className="paginacion-pagina">
          Página <strong>{pagina}</strong> de {paginas}
        </span>

        {haySiguiente ? (
          <Link className="btn ghost btn-compact" href={href(offset + porPagina)} rel="next">
            Siguiente
          </Link>
        ) : (
          <span className="btn ghost btn-compact is-inerte" aria-disabled="true">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
