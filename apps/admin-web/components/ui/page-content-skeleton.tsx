import { ApiFlujosLoader } from "./apiflujos-loader";

/**
 * Estado de carga del área de contenido.
 *
 * Encabeza con el LOGO ANIMADO y debajo mantiene el esqueleto de bloques: el
 * logo dice "está vivo, viene en camino" y el esqueleto anticipa la forma de
 * lo que va a llegar. Antes sólo había bloques grises y la sensación era de
 * que el navegador se había quedado colgado.
 */
export function PageContentSkeleton() {
  return (
    <section className="page-stack page-skeleton" aria-busy="true" aria-label="Cargando contenido">
      <div className="af-skeleton-head">
        <ApiFlujosLoader size="md" label="Cargando" />
        <span className="af-loader-text">Cargando…</span>
      </div>
      <div className="page-module-shell page-skeleton-block page-skeleton-header" />
      <div className="page-module-shell page-skeleton-block page-skeleton-toolbar" />
      <section className="metrics-kpis metrics-kpis-tight">
        {[0, 1, 2].map((i) => (
          <article key={i} className="metrics-kpi page-skeleton-block page-skeleton-stat" />
        ))}
      </section>
      <div className="page-module-shell page-skeleton-block page-skeleton-table" />
    </section>
  );
}
