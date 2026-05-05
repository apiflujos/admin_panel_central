import type { ReactNode } from "react";

export function StageGuide({
  title,
  description,
  next,
  items,
}: {
  title: string;
  description: string;
  next?: ReactNode;
  items: string[];
}) {
  return (
    <section className="page-module-shell stage-guide-shell">
      <div className="page-module-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {next ? <div className="page-module-actions">{next}</div> : null}
      </div>
      <div className="stage-guide-grid">
        {items.map((item) => (
          <article className="stage-guide-card" key={`${title}:${item}`}>
            <strong>{item}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
