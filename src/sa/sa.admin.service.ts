import { getPool } from "../db";
import { ensureModuleDefinition } from "./sa.repository";

export function monthKeyUtc(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export async function getTenantMonthlySummary(tenantId: number, periodKey?: string) {
  const pool = getPool();
  const tenant = Number(tenantId);
  if (!Number.isInteger(tenant) || tenant <= 0) throw new Error("tenant_id inválido");
  const period = periodKey && /^\d{4}-\d{2}$/.test(periodKey) ? periodKey : monthKeyUtc();

  const usage = await pool.query<{
    service_key: string;
    total: string;
  }>(
    `
    SELECT service_key, total::text
    FROM sa.usage_counters
    WHERE tenant_id = $1 AND period_key = $2
    ORDER BY service_key ASC
    `,
    [tenant, period]
  );

  const billing = await pool.query<{
    service_key: string;
    quantity: string;
    total: string;
  }>(
    `
    SELECT service_key, quantity::text, total::text
    FROM sa.billing_counters
    WHERE tenant_id = $1 AND period_key = $2
    ORDER BY service_key ASC
    `,
    [tenant, period]
  );

  const map = new Map<string, { usage: number; billedQty: number; billedTotal: number }>();
  usage.rows.forEach((r) => {
    map.set(r.service_key, { usage: Number(r.total || 0), billedQty: 0, billedTotal: 0 });
  });
  billing.rows.forEach((r) => {
    const existing = map.get(r.service_key) || { usage: 0, billedQty: 0, billedTotal: 0 };
    existing.billedQty = Number(r.quantity || 0);
    existing.billedTotal = Number(r.total || 0);
    map.set(r.service_key, existing);
  });

  const services = Array.from(map.entries()).map(([serviceKey, value]) => ({
    serviceKey,
    usage: value.usage,
    billedQty: value.billedQty,
    billedTotal: value.billedTotal,
  }));

  return {
    tenantId: tenant,
    periodKey: period,
    services,
    billedTotal: services.reduce((acc, s) => acc + (Number(s.billedTotal) || 0), 0),
  };
}

export async function resetTenantCounters(tenantId: number, periodKey: string) {
  const pool = getPool();
  const tenant = Number(tenantId);
  if (!Number.isInteger(tenant) || tenant <= 0) throw new Error("tenant_id inválido");
  const period = String(periodKey || "");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("period_key inválido");

  await pool.query(`DELETE FROM sa.usage_counters WHERE tenant_id = $1 AND period_key = $2`, [tenant, period]);
  await pool.query(`DELETE FROM sa.billing_counters WHERE tenant_id = $1 AND period_key = $2`, [tenant, period]);
  return { ok: true, tenantId: tenant, periodKey: period };
}

export async function listModules() {
  const pool = getPool();
  const res = await pool.query<{ key: string; name: string; active: boolean }>(
    `
    SELECT key, name, active
    FROM sa.module_definitions
    ORDER BY key ASC
    `
  );
  return res.rows.map((r) => ({ key: r.key, name: r.name, active: Boolean(r.active) }));
}

export async function setTenantModule(tenantId: number, moduleKey: string, enabled: boolean) {
  const pool = getPool();
  const tenant = Number(tenantId);
  if (!Number.isInteger(tenant) || tenant <= 0) throw new Error("tenant_id inválido");
  const key = String(moduleKey || "").trim();
  if (!key) throw new Error("module_key requerido");
  await ensureModuleDefinition(key, key);
  await pool.query(
    `
    INSERT INTO sa.tenant_modules (tenant_id, module_key, enabled, updated_at)
    VALUES ($1,$2,$3,NOW())
    ON CONFLICT (tenant_id, module_key)
    DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
    `,
    [tenant, key, Boolean(enabled)]
  );
  return { ok: true, tenantId: tenant, moduleKey: key, enabled: Boolean(enabled) };
}

