import type { ReactNode } from "react";

import { appNavigation } from "../lib/navigation";
import { getServerCompanyBrand } from "../lib/server-api";
import type { AuthSessionDto } from "../../../packages/shared/src/admin-web";

function renderSection(section: "operacion" | "sistema") {
  return section === "operacion" ? "Operación" : null;
}

function resolveShellTitle(activeHref: string) {
  const explicit = appNavigation.find((item) => item.href === activeHref)?.label;
  if (explicit) return explicit;
  if (activeHref === "/operations") return "Incidencias";
  if (activeHref === "/profile") return "Perfil";
  if (activeHref === "/company") return "Empresa";
  if (activeHref === "/users") return "Usuarios";
  if (activeHref === "/ai-assistants") return "Asistentes IA";
  return "Admin Central";
}

function resolveShellSubtitle(activeHref: string) {
  if (activeHref === "/") return "Vista operativa.";
  if (activeHref === "/orders") return "Pedidos y facturas.";
  if (activeHref === "/operations") return "Errores y correcciones.";
  if (activeHref === "/invoices") return "Emisión y control.";
  if (activeHref === "/contacts") return "Clientes y match.";
  if (activeHref === "/products") return "Catálogo y stock.";
  if (activeHref === "/marketing") return "Canales y campañas.";
  if (activeHref === "/settings/connections") return "Conexiones y setup.";
  if (activeHref === "/superadmin") return "Acceso y soporte.";
  if (activeHref === "/profile") return "Perfil y seguridad.";
  if (activeHref === "/company") return "Identidad del cliente.";
  if (activeHref === "/users") return "Usuarios y roles.";
  if (activeHref === "/ai-assistants") return "Asistentes y automatización.";
  return "Superficie operativa.";
}

function getBrandInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "AF";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "AF";
}

const APIFLUJOS_LOGO_SRC = "/assets/logo.png";
const APIFLUJOS_AVATAR_SRC = "/assets/avatar.png";

export async function AppShell({
  children,
  session,
  activeHref = "/",
}: {
  children: ReactNode;
  session?: AuthSessionDto | null;
  activeHref?: string;
}) {
  const brand = await getServerCompanyBrand();
  const normalizedCompanyName = brand.companyName.trim();
  const hasDistinctClientBrand = Boolean(brand.logoBase64) || normalizedCompanyName.toLowerCase() !== "apiflujos";
  const clientInitials = getBrandInitials(brand.companyName);
  const operationItems = appNavigation.filter((item) => item.section === "operacion");
  const systemItems = appNavigation.filter((item) => item.section === "sistema");
  const showAdminShortcuts = Boolean(session && (session.role === "admin" || session.role === "super_admin"));

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebarShell">
          <div className="sidebarBrandMeta">
            <img className="sidebarBrandLogo" src={APIFLUJOS_AVATAR_SRC} alt="ApiFlujos" />
            <div className="sidebarBrandText">
              <strong>ApiFlujos</strong>
              <span>Admin Central</span>
            </div>
          </div>

          {hasDistinctClientBrand ? (
            <div className="sidebarClientBrand">
              {brand.logoBase64 ? (
                <img className="sidebarClientLogo" src={brand.logoBase64} alt={brand.companyName} />
              ) : (
                <div className="sidebarClientMark" aria-hidden="true">
                  {clientInitials}
                </div>
              )}
              <div className="sidebarClientText">
                <strong>{brand.companyName}</strong>
                <span>Cliente activo</span>
              </div>
            </div>
          ) : null}

          <nav className="nav">
            <div className="nav-section">{renderSection("operacion")}</div>
            {operationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                aria-current={item.href === activeHref ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
            {renderSection("sistema") ? <div className="nav-section">{renderSection("sistema")}</div> : null}
            {systemItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                aria-current={item.href === activeHref ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="sidebarSpacer" />

          <div className="sidebarFooter">
            <a className="sidebarExit" href="/legacy/settings/stores">
              <span className="nav-icon" aria-hidden="true">
                ↗
              </span>
              <span className="nav-label">Ajustes avanzados</span>
            </a>

            {session ? (
              <form action="/api/session/logout" method="post">
                <button className="sidebarExit" type="submit">
                  <span className="nav-icon" aria-hidden="true">
                    →
                  </span>
                  <span className="nav-label">Salir</span>
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbarLeft">
            <div className="sidebarToggleBtn" aria-hidden="true">
              ‹
            </div>
            <div className="topbarBrand">
              <img className="topbarBrandLogo" src={APIFLUJOS_LOGO_SRC} alt="ApiFlujos" />
              <div className="topbarBrandText">
                <strong>ApiFlujos</strong>
                <span>{hasDistinctClientBrand ? brand.companyName : "Admin Central"}</span>
              </div>
            </div>
          </div>
          <div className="topbarTitleCentered">
            <div className="topbarTitle">
              <strong>{resolveShellTitle(activeHref)}</strong>
            </div>
            <div className="topbarSubtitle">{resolveShellSubtitle(activeHref)}</div>
          </div>
          <div className="topbarActions">
            <div className="topbarQuickGroup">
              {session ? (
                <a className="topbarQuickPill" href="/profile">
                  Perfil
                </a>
              ) : null}
              {showAdminShortcuts ? (
                <a className="topbarQuickPill" href="/company">
                  Empresa
                </a>
              ) : null}
              {showAdminShortcuts ? (
                <a className="topbarQuickPill" href="/users">
                  Usuarios
                </a>
              ) : null}
              {showAdminShortcuts ? (
                <a className="topbarQuickPill" href="/ai-assistants">
                  IA
                </a>
              ) : null}
            </div>
            <button className="topbarBellBtn" type="button" aria-label="Alertas">
              <span aria-hidden="true">◌</span>
            </button>
            {session ? (
              <div className="userMenu">
                <a className="userMenuBtn" href="/profile">
                  <img className="userMenuAvatarImage" src={APIFLUJOS_AVATAR_SRC} alt="ApiFlujos" />
                  <span className="userMenuName">
                    <strong>{session.displayName}</strong>
                    <span className="subtitle">{session.roleLabel}</span>
                  </span>
                  <span className="userMenuIcon" aria-hidden="true">
                    ⌄
                  </span>
                </a>
              </div>
            ) : null}
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
