export function PageContentSkeleton() {
  return (
    <section className="page-stack page-skeleton" aria-busy="true" aria-label="Cargando contenido">
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
