import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header-standard">
      <div className="breadcrumbs">{breadcrumbs}</div>
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
