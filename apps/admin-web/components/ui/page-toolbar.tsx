import type { ReactNode } from "react";

export function PageToolbar({
  search,
  filters,
  views,
  actions,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  views?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-toolbar">
      <div className="page-toolbar-row page-toolbar-row-1">
        {search ? <div className="page-toolbar-search">{search}</div> : null}
        {filters ? <div className="page-toolbar-filters">{filters}</div> : null}
      </div>
      <div className="page-toolbar-row page-toolbar-row-2">
        {views ? <div className="page-toolbar-views">{views}</div> : <div />}
        {actions ? <div className="page-toolbar-right">{actions}</div> : null}
      </div>
    </div>
  );
}
