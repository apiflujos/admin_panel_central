export function PageContentSkeleton() {
  return (
    <section
      className="page-stack"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div
        className="card"
        style={{ padding: "7px 10px", minHeight: 52 }}
      />
      <div
        className="card"
        style={{ padding: "7px 10px", minHeight: 44 }}
      />
      <section className="stats-grid">
        {[0, 1, 2].map((i) => (
          <article key={i} className="card stat-card" style={{ minHeight: 64 }} />
        ))}
      </section>
      <div
        className="card table-card"
        style={{ minHeight: 200 }}
      />
    </section>
  );
}
