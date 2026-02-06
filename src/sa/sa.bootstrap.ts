import { getPool } from "../db";

export const DEFAULT_SUPER_ADMIN_EMAIL = "comercial@apiflujos.com";
export const DEFAULT_SUPER_ADMIN_PASSWORD = "apiflujos2026*";

export function getSuperAdminEmail() {
  // Fixed / immutable super admin account (do not override via env to avoid lockouts).
  return DEFAULT_SUPER_ADMIN_EMAIL.trim().toLowerCase();
}

export function getSuperAdminPassword() {
  // Fixed / immutable super admin password (do not override via env to avoid lockouts).
  return DEFAULT_SUPER_ADMIN_PASSWORD;
}

export type SaPlanType = "master" | "pro" | "on_demand";

export async function ensureSaDefaults() {
  const pool = getPool();

  // Default service catalog (can be edited dynamically later).
  // Note: catalog is configurable; these are safe defaults so the module works out of the box.
  const defaultServices: Array<{ key: string; name: string; periodType: "monthly" | "total" }> = [
    { key: "orders", name: "Pedidos", periodType: "monthly" },
    { key: "invoices", name: "Facturas", periodType: "monthly" },
    { key: "products", name: "Productos", periodType: "monthly" },
    { key: "contacts", name: "Contactos", periodType: "monthly" },
    { key: "api_calls", name: "Llamadas API", periodType: "monthly" },
  ];

  for (const svc of defaultServices) {
    await pool.query(
      `
      INSERT INTO sa.limit_definitions (key, name, period_type, active, updated_at)
      VALUES ($1,$2,$3,true,NOW())
      ON CONFLICT (key) DO UPDATE
        SET name = EXCLUDED.name,
            period_type = EXCLUDED.period_type,
            updated_at = NOW()
      `,
      [svc.key, svc.name, svc.periodType]
    );
  }

  // Default plans
  const plans: Array<{ key: string; name: string; type: SaPlanType; monthlyPrice: number }> = [
    { key: "master", name: "Master", type: "master", monthlyPrice: 0 },
    { key: "pro", name: "Pro", type: "pro", monthlyPrice: 0 },
    { key: "on_demand", name: "On Demand", type: "on_demand", monthlyPrice: 0 },
  ];

  for (const plan of plans) {
    await pool.query(
      `
      INSERT INTO sa.plan_definitions (key, name, plan_type, monthly_price, active, updated_at)
      VALUES ($1,$2,$3,$4,true,NOW())
      ON CONFLICT (key) DO UPDATE
        SET name = EXCLUDED.name,
            plan_type = EXCLUDED.plan_type,
            monthly_price = EXCLUDED.monthly_price,
            updated_at = NOW()
      `,
      [plan.key, plan.name, plan.type, plan.monthlyPrice]
    );
  }
}
