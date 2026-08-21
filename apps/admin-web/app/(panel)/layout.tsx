import type { ReactNode } from "react";

import { AppShell } from "../../components/app-shell";
import { requireServerSessionProfile } from "../../lib/server-api";

/**
 * Layout de todas las pantallas autenticadas.
 *
 * `(panel)` es un GRUPO DE RUTAS: los paréntesis no aparecen en la URL, así que
 * `/orders` sigue siendo `/orders`.
 *
 * Aquí está el arreglo de la lentitud percibida: el menú y la cabecera se montan
 * UNA vez y persisten al navegar. Antes cada página montaba su propio `AppShell`
 * y el `loading.tsx` era un esqueleto SIN shell, de modo que en cada clic
 * desaparecía la interfaz entera y volvía a aparecer.
 *
 * La sesión también se resuelve una sola vez, en vez de en cada página.
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await requireServerSessionProfile();
  return <AppShell session={session}>{children}</AppShell>;
}
