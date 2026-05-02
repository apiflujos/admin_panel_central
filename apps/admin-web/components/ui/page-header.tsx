import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header-standard">
      <div className="breadcrumbs">{breadcrumbs}</div>
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          <p className="page-header-subtitle">{subtitle}</p>
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
