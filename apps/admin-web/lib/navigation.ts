export type AppNavigationItem = {
  label: string;
  href: string;
  section: "operacion" | "sistema";
  icon: string;
};

export const appNavigation: AppNavigationItem[] = [
  { label: "Métricas", href: "/", section: "operacion", icon: "◈" },
  { label: "Pedidos", href: "/orders", section: "operacion", icon: "◫" },
  { label: "Facturas", href: "/invoices", section: "operacion", icon: "◻" },
  { label: "Contactos", href: "/contacts", section: "operacion", icon: "◎" },
  { label: "Productos", href: "/products", section: "operacion", icon: "▦" },
  { label: "Marketing", href: "/marketing", section: "operacion", icon: "◬" },
  { label: "Configuración", href: "/settings/connections", section: "sistema", icon: "◉" },
  { label: "Super Admin", href: "/superadmin", section: "sistema", icon: "◈" },
  { label: "Logs de API", href: "/logs", section: "sistema", icon: "≡" },
];
