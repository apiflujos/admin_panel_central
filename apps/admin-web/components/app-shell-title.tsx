"use client";

import { usePathname } from "next/navigation";

import { resolveShellSubtitle, resolveShellTitle } from "../lib/shell-copy";

/** Título y subtítulo de la cabecera, resueltos desde la ruta activa. */
export function AppShellTitle() {
  const pathname = usePathname() || "/";
  return (
    <>
      <div className="topbarTitle">
        <strong>{resolveShellTitle(pathname)}</strong>
      </div>
      <div className="topbarSubtitle">{resolveShellSubtitle(pathname)}</div>
    </>
  );
}
