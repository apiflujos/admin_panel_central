import { appNavigation } from "./navigation";

/**
 * Título y subtítulo de la cabecera según la ruta activa.
 *
 * Viven aquí, fuera del `AppShell`, porque ahora los resuelve un componente de
 * cliente a partir de la ruta: el shell se monta UNA vez en el layout y no se
 * vuelve a renderizar al navegar.
 */
export function resolveShellTitle(activeHref: string) {
  const explicit = appNavigation.find((item) => item.href === activeHref)?.label;
  if (explicit) return explicit;
  if (activeHref === "/profile") return "Perfil";
  if (activeHref === "/company") return "Empresa";
  if (activeHref === "/users") return "Usuarios";
  if (activeHref === "/ai-assistants") return "Asistentes IA";
  if (activeHref.startsWith("/superadmin")) return "Super Admin";
  if (activeHref.startsWith("/settings")) return "Configuración";
  return "Admin Central";
}

export function resolveShellSubtitle(activeHref: string) {
  if (activeHref === "/") return "Vista consolidada del rendimiento operativo.";
  if (activeHref === "/orders") return "Pedidos, estados y facturación del flujo comercial.";
  if (activeHref === "/operations") return "Seguimiento de sincronizaciones y ejecución operativa.";
  if (activeHref === "/invoices") return "Control de facturas y estado de emisión.";
  if (activeHref === "/contacts") return "Base comercial y sincronización de clientes.";
  if (activeHref === "/products") return "Catálogo, stock y disponibilidad comercial.";
  if (activeHref === "/settings/connections") return "Conexiones, webhooks y configuración troncal.";
  if (activeHref === "/settings/stores") return "Tiendas conectadas y sus reglas.";
  if (activeHref === "/superadmin/workers") return "Trabajos automáticos: qué corre y qué no.";
  if (activeHref === "/superadmin") return "Control de acceso y soporte ApiFlujos.";
  if (activeHref === "/logs") return "Registro de actividad de la integración.";
  if (activeHref === "/profile") return "Preferencias personales y seguridad.";
  if (activeHref === "/company") return "Identidad del cliente y datos corporativos.";
  if (activeHref === "/users") return "Usuarios internos y roles autorizados.";
  if (activeHref === "/ai-assistants") return "Asistentes operativos y automatización guiada.";
  return "Superficie operativa estandarizada para todos los clientes.";
}

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
