import { getPool } from "../db";
import type { SaPlanType } from "./sa.bootstrap";

export type ServiceDefinition = {
  key: string;
  name: string;
  periodType: "monthly" | "total";
  active: boolean;
};

export type PlanSnapshotService = {
  serviceKey: string;
  periodType: "monthly" | "total";
  isUnlimited: boolean;
  maxValue: number | null;
  unitPrice: number;
};

export type PlanSnapshot = {
  tenantId: number;
  planKey: string;
  planType: SaPlanType;
  monthlyPrice: number;
  services: Record<string, PlanSnapshotService>;
  updatedAt: string;
};

export async function ensureServiceDefinition(serviceKey: string) {
  const pool = getPool();
  const key = String(serviceKey || "").trim();
  if (!key) throw new Error("service_key requerido");
  await pool.query(
    `
    INSERT INTO sa.limit_definitions (key, name, period_type, active, updated_at)
    VALUES ($1,$2,'monthly',true,NOW())
    ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
    `,
    [key, key]
  );
}

export async function listActiveServiceDefinitions() {
  const pool = getPool();
  const res = await pool.query<{
    key: string;
    name: string;
    period_type: string;
    active: boolean;
  }>(
    `
    SELECT key, name, period_type, active
    FROM sa.limit_definitions
    WHERE active = true
    ORDER BY key ASC
    `
  );
  return res.rows.map((r) => ({
    key: r.key,
    name: r.name,
    periodType: r.period_type === "total" ? "total" : "monthly",
    active: Boolean(r.active),
  })) satisfies ServiceDefinition[];
}

export async function getServiceDefinition(serviceKey: string) {
  const pool = getPool();
  const key = String(serviceKey || "").trim();
  const res = await pool.query<{
    key: string;
    name: string;
    period_type: string;
    active: boolean;
  }>(
    `
    SELECT key, name, period_type, active
    FROM sa.limit_definitions
    WHERE key = $1
    LIMIT 1
    `,
    [key]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    key: row.key,
    name: row.name,
    periodType: row.period_type === "total" ? "total" : "monthly",
    active: Boolean(row.active),
  } satisfies ServiceDefinition;
}

export async function getTenantAssignedPlanRow(tenantId: number) {
  const pool = getPool();
  const res = await pool.query<{
    tenant_id: number;
    plan_id: string;
    snapshot_json: any;
  }>(
    `
    SELECT tenant_id, plan_id::text, snapshot_json
    FROM sa.tenant_plans
    WHERE tenant_id = $1
    LIMIT 1
    `,
    [tenantId]
  );
  return res.rows[0] || null;
}

export async function assignTenantPlan(tenantId: number, planKey: string) {
  const pool = getPool();
  const tenant = Number(tenantId);
  if (!Number.isInteger(tenant) || tenant <= 0) throw new Error("tenant_id inválido");
  const key = String(planKey || "").trim();
  if (!key) throw new Error("plan_key requerido");

  const planRes = await pool.query<{ id: string }>(
    `
    SELECT id::text AS id
    FROM sa.plan_definitions
    WHERE key = $1 AND active = true
    LIMIT 1
    `,
    [key]
  );
  const planId = planRes.rows[0]?.id;
  if (!planId) throw new Error("Plan no encontrado o inactivo.");

  await pool.query(
    `
    INSERT INTO sa.tenant_plans (tenant_id, plan_id, snapshot_json, assigned_at, updated_at)
    VALUES ($1,$2,'{}'::jsonb,NOW(),NOW())
    ON CONFLICT (tenant_id)
    DO UPDATE SET plan_id = EXCLUDED.plan_id,
                  snapshot_json = '{}'::jsonb,
                  assigned_at = NOW(),
                  updated_at = NOW()
    `,
    [tenant, planId]
  );
  return { tenantId: tenant, planId, planKey: key };
}

export async function buildTenantPlanSnapshot(tenantId: number): Promise<PlanSnapshot> {
  const pool = getPool();
  const tenant = Number(tenantId);
  if (!Number.isInteger(tenant) || tenant <= 0) throw new Error("tenant_id inválido");

  const planRes = await pool.query<{
    plan_key: string;
    plan_type: string;
    monthly_price: string;
  }>(
    `
    SELECT p.key AS plan_key, p.plan_type, p.monthly_price::text
    FROM sa.tenant_plans tp
    JOIN sa.plan_definitions p ON p.id = tp.plan_id
    WHERE tp.tenant_id = $1
    LIMIT 1
    `,
    [tenant]
  );
  const planRow = planRes.rows[0];
  if (!planRow) {
    // Default: Master
    await assignTenantPlan(tenant, "master");
    return buildTenantPlanSnapshot(tenant);
  }

  const planType: SaPlanType =
    planRow.plan_type === "on_demand"
      ? "on_demand"
      : planRow.plan_type === "pro"
        ? "pro"
        : "master";

  const monthlyPrice = Number(planRow.monthly_price || 0);

  const services = await pool.query<{
    key: string;
    period_type: string;
    is_unlimited: boolean | null;
    max_value: string | null;
    unit_price: string | null;
  }>(
    `
    SELECT
      ld.key,
      ld.period_type,
      psl.is_unlimited,
      psl.max_value::text AS max_value,
      psl.unit_price::text AS unit_price
    FROM sa.limit_definitions ld
    LEFT JOIN sa.tenant_plans tp ON tp.tenant_id = $1
    LEFT JOIN sa.plan_definitions pd ON pd.id = tp.plan_id
    LEFT JOIN sa.plan_service_limits psl ON psl.plan_id = pd.id AND psl.service_key = ld.key
    WHERE ld.active = true
    ORDER BY ld.key ASC
    `,
    [tenant]
  );

  const serviceMap: Record<string, PlanSnapshotService> = {};
  for (const row of services.rows) {
    const periodType = row.period_type === "total" ? "total" : "monthly";
    const maxValue = row.max_value === null ? null : Number(row.max_value);
    const unitPrice = row.unit_price === null ? 0 : Number(row.unit_price);
    const configuredUnlimited = row.is_unlimited === null ? null : Boolean(row.is_unlimited);

    const isUnlimited =
      planType === "master" || planType === "on_demand"
        ? true
        : (configuredUnlimited === true || maxValue === null);

    serviceMap[row.key] = {
      serviceKey: row.key,
      periodType,
      isUnlimited,
      maxValue: planType === "pro" ? maxValue : null,
      unitPrice: planType === "on_demand" ? unitPrice : (planType === "pro" ? unitPrice : 0),
    };
  }

  const snapshot: PlanSnapshot = {
    tenantId: tenant,
    planKey: planRow.plan_key,
    planType,
    monthlyPrice: Number.isFinite(monthlyPrice) ? monthlyPrice : 0,
    services: serviceMap,
    updatedAt: new Date().toISOString(),
  };

  await pool.query(
    `
    UPDATE sa.tenant_plans
    SET snapshot_json = $2, updated_at = NOW()
    WHERE tenant_id = $1
    `,
    [tenant, snapshot]
  );

  return snapshot;
}

export async function getTenantPlanSnapshot(tenantId: number): Promise<PlanSnapshot> {
  const pool = getPool();
  const tenant = Number(tenantId);
  const res = await pool.query<{ snapshot_json: any }>(
    `
    SELECT snapshot_json
    FROM sa.tenant_plans
    WHERE tenant_id = $1
    LIMIT 1
    `,
    [tenant]
  );
  const snap = res.rows[0]?.snapshot_json;
  if (snap && typeof snap === "object" && snap.planKey && snap.planType && snap.services) {
    return snap as PlanSnapshot;
  }
  return buildTenantPlanSnapshot(tenant);
}

export async function ensureModuleDefinition(moduleKey: string, name?: string) {
  const pool = getPool();
  const key = String(moduleKey || "").trim();
  if (!key) throw new Error("module_key requerido");
  const label = String(name || key).trim() || key;
  await pool.query(
    `
    INSERT INTO sa.module_definitions (key, name, active, updated_at)
    VALUES ($1,$2,true,NOW())
    ON CONFLICT (key) DO UPDATE
      SET name = COALESCE(NULLIF(EXCLUDED.name,''), sa.module_definitions.name),
          updated_at = NOW()
    `,
    [key, label]
  );
}

export async function isTenantModuleEnabled(tenantId: number, moduleKey: string) {
  const pool = getPool();
  const tenant = Number(tenantId);
  const key = String(moduleKey || "").trim();
  if (!tenant || !key) return true;
  await ensureModuleDefinition(key, key);
  const res = await pool.query<{ enabled: boolean; active: boolean }>(
    `
    SELECT COALESCE(tm.enabled, true) AS enabled,
           COALESCE(md.active, true) AS active
    FROM sa.module_definitions md
    LEFT JOIN sa.tenant_modules tm
      ON tm.module_key = md.key AND tm.tenant_id = $1
    WHERE md.key = $2
    LIMIT 1
    `,
    [tenant, key]
  );
  const row = res.rows[0];
  if (!row) return true;
  return Boolean(row.active) && Boolean(row.enabled);
}

