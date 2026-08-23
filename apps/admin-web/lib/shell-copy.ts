import { appNavigation } from "./navigation";

/**
 * ¿Qué entrada del menú corresponde a esta ruta?
 *
 * Coincidencia exacta primero y, si no, el prefijo más largo: así
 * `/superadmin/workers` marca «Trabajos automáticos» y no «Super Admin».
 */
export function resolveActiveHref(pathname: string, hrefs: string[]) {
  if (hrefs.includes(pathname)) return pathname;
  const candidatos = hrefs
    .filter((href) => href !== "/" && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);
  return candidatos[0] ?? pathname;
}
