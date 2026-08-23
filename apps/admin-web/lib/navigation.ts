import {
  BarChart3,
  FileText,
  KeyRound,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppNavigationItem = {
  label: string;
  href: string;
  section: "operacion" | "sistema";
  icon: LucideIcon;
};

export const appNavigation: AppNavigationItem[] = [
  { label: "Métricas", href: "/", section: "operacion", icon: BarChart3 },
  { label: "Pedidos", href: "/orders", section: "operacion", icon: Package },
  { label: "Facturas", href: "/invoices", section: "operacion", icon: FileText },
  { label: "Contactos", href: "/contacts", section: "operacion", icon: Users },
  { label: "Productos", href: "/products", section: "operacion", icon: ShoppingBag },
  { label: "Configuración", href: "/settings/connections", section: "sistema", icon: Settings },
  { label: "Super Admin", href: "/superadmin", section: "sistema", icon: KeyRound },
  { label: "Logs de API", href: "/logs", section: "sistema", icon: ScrollText },
];
