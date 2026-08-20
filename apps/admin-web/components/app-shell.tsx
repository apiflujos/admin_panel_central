import type { ReactNode } from "react";
import Link from "next/link";

import { appNavigation } from "../lib/navigation";
import { getServerCompanyBrand } from "../lib/server-api";
import type { AuthSessionDto } from "../../../packages/shared/src/admin-web";
import { LogoutButton } from "./logout-button";

function renderSection(section: "operacion" | "sistema") {
  return section === "operacion" ? "Operación" : null;
}

function resolveShellTitle(activeHref: string) {
  const explicit = appNavigation.find((item) => item.href === activeHref)?.label;
  if (explicit) return explicit;
  if (activeHref === "/profile") return "Perfil";
  if (activeHref === "/company") return "Empresa";
  if (activeHref === "/users") return "Usuarios";
  if (activeHref === "/ai-assistants") return "Asistentes IA";
  return "Admin Central";
}

function resolveShellSubtitle(activeHref: string) {
  if (activeHref === "/") return "Vista consolidada del rendimiento operativo.";
  if (activeHref === "/orders") return "Pedidos, estados y facturación del flujo comercial.";
  if (activeHref === "/operations") return "Seguimiento de sincronizaciones y ejecución operativa.";
  if (activeHref === "/invoices") return "Control de facturas y estado de emisión.";
  if (activeHref === "/contacts") return "Base comercial y sincronización de clientes.";
  if (activeHref === "/products") return "Catálogo, stock y disponibilidad comercial.";
  if (activeHref === "/settings/connections") return "Conexiones, webhooks y configuración troncal.";
  if (activeHref === "/superadmin") return "Control de acceso y soporte ApiFlujos.";
  if (activeHref === "/profile") return "Preferencias personales y seguridad.";
  if (activeHref === "/company") return "Identidad del cliente y datos corporativos.";
  if (activeHref === "/users") return "Usuarios internos y roles autorizados.";
  if (activeHref === "/ai-assistants") return "Asistentes operativos y automatización guiada.";
  return "Superficie operativa estandarizada para todos los clientes.";
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
  // Guard: pages using AppShell require a session. This prevents a flash of
  // the logged-in shell before the server redirects an unauthenticated user.
  if (!session) {
    return null;
  }

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
            {operationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                  aria-current={item.href === activeHref ? "page" : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
            {renderSection("sistema") ? <div className="nav-section">{renderSection("sistema")}</div> : null}
            {systemItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.href === activeHref ? "nav-item is-active" : "nav-item"}
                  aria-current={item.href === activeHref ? "page" : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebarSpacer" />

          <div className="sidebarFooter">
            {session ? <LogoutButton /> : null}
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
                <Link className="topbarQuickPill" href="/profile">
                  Perfil
                </Link>
              ) : null}
              {showAdminShortcuts ? (
                <Link className="topbarQuickPill" href="/company">
                  Empresa
                </Link>
              ) : null}
              {showAdminShortcuts ? (
                <Link className="topbarQuickPill" href="/users">
                  Usuarios
                </Link>
              ) : null}
              {showAdminShortcuts ? (
                <Link className="topbarQuickPill" href="/ai-assistants">
                  IA
                </Link>
              ) : null}
            </div>
            <button className="topbarBellBtn" type="button" aria-label="Alertas">
              <span aria-hidden="true">◌</span>
            </button>
            {session ? (
              <div className="userMenu">
                <Link className="userMenuBtn" href="/profile">
                  <img className="userMenuAvatarImage" src={APIFLUJOS_AVATAR_SRC} alt="ApiFlujos" />
                  <span className="userMenuName">
                    <strong>{session.displayName}</strong>
                    <span className="subtitle">{session.roleLabel}</span>
                  </span>
                  <span className="userMenuIcon" aria-hidden="true">
                    ⌄
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
