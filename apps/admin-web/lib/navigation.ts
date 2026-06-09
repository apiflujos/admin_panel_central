export type AppNavigationItem = {
  label: string;
  href: string;
  section: "operacion" | "sistema";
  icon: string;
};

export const appNavigation: AppNavigationItem[] = [
  { label: "Métricas", href: "/", section: "operacion", icon: "ME" },
  { label: "Pedidos", href: "/orders", section: "operacion", icon: "PD" },
  { label: "Facturas", href: "/invoices", section: "operacion", icon: "FT" },
  { label: "Contactos", href: "/contacts", section: "operacion", icon: "CT" },
  { label: "Productos", href: "/products", section: "operacion", icon: "PR" },
  { label: "Marketing", href: "/marketing", section: "operacion", icon: "MK" },
  { label: "Configuración", href: "/settings/connections", section: "sistema", icon: "CF" },
  { label: "Super Admin", href: "/superadmin", section: "sistema", icon: "SA" },
  { label: "Logs de API", href: "/logs", section: "sistema", icon: "LG" },
];
