import type { ReactNode } from "react";

import { appNavigation } from "../lib/navigation";
import type { AuthSessionDto } from "../../../packages/shared/src/admin-web";

function renderSection(section: "operacion" | "sistema") {
  return section === "operacion" ? "Operación" : "Sistema";
}

export function AppShell({
  children,
  session,
  activeHref = "/",
}: {
  children: ReactNode;
  session?: AuthSessionDto | null;
  activeHref?: string;
}) {
  const operationItems = appNavigation.filter((item) => item.section === "operacion");
  const systemItems = appNavigation.filter((item) => item.section === "sistema");

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="sidebarShell">
          <div className="sidebarBrandMeta">
            <div className="sidebarBrandMark" aria-hidden="true">
              AF
            </div>
            <div className="sidebarBrandText">
              <strong>ApiFlujos</strong>
              <span>Admin Central</span>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-section">{renderSection("operacion")}</div>
            {operationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                aria-current={item.href === activeHref ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}

            <div className="nav-section">{renderSection("sistema")}</div>
            {systemItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                aria-current={item.href === activeHref ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="sidebarSpacer" />

          {session ? (
            <form action="/api/session/logout" method="post">
              <button className="sidebarExit" type="submit">
                <span className="nav-icon" aria-hidden="true">→</span>
                <span className="nav-label">Salir</span>
              </button>
            </form>
          ) : null}
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbarBrand">
            <span className="topbarBrandMark" aria-hidden="true">
              AF
            </span>
            <strong>ApiFlujos</strong>
          </div>
          <div className="topbarTitle">
            <strong>{appNavigation.find((item) => item.href === activeHref)?.label || "Admin Central"}</strong>
          </div>
          <div className="topbarActions">
            {session ? <span className="pill">{session.roleLabel}</span> : null}
            {session ? <span className="pill">{session.displayName}</span> : null}
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
