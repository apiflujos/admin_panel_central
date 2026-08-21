"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appNavigation } from "../lib/navigation";
import { resolveActiveHref } from "../lib/shell-copy";

/**
 * Enlaces del menú, con el activo resuelto en el CLIENTE.
 *
 * Antes cada página pasaba su `activeHref` al shell, lo que obligaba a montar
 * el shell dentro de la página: al navegar se desmontaba el menú entero y la
 * pantalla parpadeaba. Ahora el shell vive en el layout y sólo esta lista, que
 * es diminuta, reacciona al cambio de ruta.
 */
export function AppShellNav({ section }: { section: "operacion" | "sistema" }) {
  const pathname = usePathname() || "/";
  const activeHref = resolveActiveHref(
    pathname,
    appNavigation.map((item) => item.href)
  );
  const items = appNavigation.filter((item) => item.section === section);

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "nav-item is-active" : "nav-item"}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
