import type { ReactNode } from "react";
import Link from "next/link";

import { AppShellNav } from "./app-shell-nav";
import { AppShellTitle } from "./app-shell-title";
import { getServerCompanyBrand } from "../lib/server-api";
import type { AuthSessionDto } from "../../../packages/shared/src/admin-web";
import { LogoutButton } from "./logout-button";
import { BrandLogo } from "./ui/brand-logo";

function renderSection(section: "operacion" | "sistema") {
  return section === "operacion" ? "Operación" : null;
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

// La mascota se conserva para el avatar de usuario; la marca pasa a SVG.
const APIFLUJOS_AVATAR_SRC = "/assets/avatar.webp";

/**
 * Marco de la aplicación: menú, cabecera y contenedor de contenido.
 *
 * Se monta UNA sola vez, en el layout del grupo de rutas, no dentro de cada
 * página. Antes cada página lo montaba, así que al navegar Next desmontaba el
 * menú y la cabecera y pintaba un esqueleto sin ellos: la pantalla entera
 * parpadeaba y daba la sensación de recarga completa.
 *
 * La ruta activa ya no llega por props; la resuelven `AppShellNav` y
 * `AppShellTitle` en el cliente, que son lo único que se re-renderiza al
 * cambiar de página.
 */
export async function AppShell({ children, session }: { children: ReactNode; session?: AuthSessionDto | null }) {
  // Guard: pages using AppShell require a session. This prevents a flash of
  // the logged-in shell before the server redirects an unauthenticated user.
  if (!session) {
    return null;
  }

  const brand = await getServerCompanyBrand();
  const normalizedCompanyName = brand.companyName.trim();
  const hasDistinctClientBrand = Boolean(brand.logoBase64) || normalizedCompanyName.toLowerCase() !== "apiflujos";
  const clientInitials = getBrandInitials(brand.companyName);
  const showAdminShortcuts = Boolean(session && (session.role === "admin" || session.role === "super_admin"));

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebarShell">
          <div className="sidebarBrandMeta">
            <BrandLogo variant="full" height={26} subtitle="Admin Central" />
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
            <AppShellNav section="operacion" />
            {renderSection("sistema") ? <div className="nav-section">{renderSection("sistema")}</div> : null}
            <AppShellNav section="sistema" />
          </nav>

          <div className="sidebarSpacer" />

          <div className="sidebarFooter">{session ? <LogoutButton /> : null}</div>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbarLeft">
            <div className="sidebarToggleBtn" aria-hidden="true">
              ‹
            </div>
            <div className="topbarBrand">
              <BrandLogo
                variant="mark"
                height={26}
                subtitle={hasDistinctClientBrand ? brand.companyName : "Admin Central"}
              />
            </div>
          </div>
          <div className="topbarTitleCentered">
            <AppShellTitle />
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
