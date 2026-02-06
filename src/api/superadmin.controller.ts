import type { Request, Response } from "express";
import { z } from "zod";
import { getPool } from "../db";
import { assignTenantPlan, buildTenantPlanSnapshot } from "../sa/sa.repository";
import { getTenantMonthlySummary, listModules, resetTenantCounters, setTenantModule } from "../sa/sa.admin.service";

const TenantId = z.number().int().positive();
const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);
const ServiceKey = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/i);
const PlanKey = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/i);

export async function saListPlansHandler(_req: Request, res: Response) {
  const pool = getPool();
  const plans = await pool.query<{
    key: string;
    name: string;
    plan_type: string;
    monthly_price: string;
    active: boolean;
  }>(
    `
    SELECT key, name, plan_type, monthly_price::text AS monthly_price, active
    FROM sa.plan_definitions
    ORDER BY id ASC
    `
  );
  res.status(200).json({
    items: plans.rows.map((p) => ({
      key: p.key,
      name: p.name,
      planType: p.plan_type,
      monthlyPrice: Number(p.monthly_price || 0),
      active: Boolean(p.active),
    })),
  });
}

export async function saListTenantsHandler(_req: Request, res: Response) {
  const pool = getPool();
  const tenants = await pool.query<{ id: number; name: string }>(
    `
    SELECT id, name
    FROM organizations
    ORDER BY id ASC
    `
  );
  res.status(200).json({ items: tenants.rows });
}

export async function saListModulesHandler(_req: Request, res: Response) {
  const items = await listModules();
  res.status(200).json({ items });
}

export async function saListServicesHandler(_req: Request, res: Response) {
  const pool = getPool();
  const rows = await pool.query<{
    key: string;
    name: string;
    period_type: string;
    active: boolean;
  }>(
    `
    SELECT key, name, period_type, active
    FROM sa.limit_definitions
    ORDER BY key ASC
    `
  );
  res.status(200).json({
    items: rows.rows.map((r) => ({
      key: r.key,
      name: r.name,
      periodType: r.period_type === "total" ? "total" : "monthly",
      active: Boolean(r.active),
    })),
  });
}

export async function saUpsertServiceHandler(req: Request, res: Response) {
  const schema = z.object({
    key: ServiceKey,
    name: z.string().min(1).max(120),
    periodType: z.enum(["monthly", "total"]).default("monthly"),
    active: z.boolean().default(true),
  });
  try {
    const body = schema.parse(req.body || {});
    const pool = getPool();
    await pool.query(
      `
      INSERT INTO sa.limit_definitions (key, name, period_type, active, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (key) DO UPDATE
        SET name = EXCLUDED.name,
            period_type = EXCLUDED.period_type,
            active = EXCLUDED.active,
            updated_at = NOW()
      `,
      [body.key, body.name, body.periodType, body.active]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saListTenantModulesHandler(req: Request, res: Response) {
  try {
    const tenantId = TenantId.parse(Number(req.query.tenantId));
    const pool = getPool();
    const rows = await pool.query<{ key: string; name: string; active: boolean; enabled: boolean }>(
      `
      SELECT
        md.key,
        md.name,
        md.active,
        COALESCE(tm.enabled, true) AS enabled
      FROM sa.module_definitions md
      LEFT JOIN sa.tenant_modules tm
        ON tm.module_key = md.key AND tm.tenant_id = $1
      ORDER BY md.key ASC
      `,
      [tenantId]
    );
    res.status(200).json({
      items: rows.rows.map((r) => ({
        key: r.key,
        name: r.name,
        active: Boolean(r.active),
        enabled: Boolean(r.enabled) && Boolean(r.active),
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saGetTenantPlanSnapshotHandler(req: Request, res: Response) {
  try {
    const tenantId = TenantId.parse(Number(req.query.tenantId));
    const snapshot = await buildTenantPlanSnapshot(tenantId);
    res.status(200).json({ ok: true, snapshot });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saGetPlanLimitsHandler(req: Request, res: Response) {
  try {
    const planKey = PlanKey.parse(String(req.query.planKey || ""));
    const pool = getPool();
    const plan = await pool.query<{ id: string; key: string; plan_type: string }>(
      `
      SELECT id::text AS id, key, plan_type
      FROM sa.plan_definitions
      WHERE key = $1
      LIMIT 1
      `,
      [planKey]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) {
      res.status(404).json({ error: "Plan no encontrado." });
      return;
    }
    const rows = await pool.query<{
      service_key: string;
      service_name: string;
      period_type: string;
      active: boolean;
      is_unlimited: boolean | null;
      max_value: string | null;
      unit_price: string | null;
    }>(
      `
      SELECT
        ld.key AS service_key,
        ld.name AS service_name,
        ld.period_type,
        ld.active,
        psl.is_unlimited,
        psl.max_value::text AS max_value,
        psl.unit_price::text AS unit_price
      FROM sa.limit_definitions ld
      LEFT JOIN sa.plan_service_limits psl
        ON psl.service_key = ld.key AND psl.plan_id = $1
      ORDER BY ld.key ASC
      `,
      [planId]
    );
    res.status(200).json({
      planKey,
      planType: plan.rows[0]?.plan_type || null,
      items: rows.rows.map((r) => ({
        serviceKey: r.service_key,
        serviceName: r.service_name,
        periodType: r.period_type === "total" ? "total" : "monthly",
        active: Boolean(r.active),
        isUnlimited: r.is_unlimited === null ? null : Boolean(r.is_unlimited),
        maxValue: r.max_value === null ? null : Number(r.max_value),
        unitPrice: r.unit_price === null ? 0 : Number(r.unit_price),
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saUpsertPlanLimitHandler(req: Request, res: Response) {
  const schema = z.object({
    planKey: PlanKey,
    serviceKey: ServiceKey,
    isUnlimited: z.boolean().optional(),
    maxValue: z.number().nullable().optional(),
    unitPrice: z.number().optional(),
  });
  try {
    const body = schema.parse(req.body || {});
    const pool = getPool();
    const plan = await pool.query<{ id: string }>(
      `
      SELECT id::text AS id
      FROM sa.plan_definitions
      WHERE key = $1
      LIMIT 1
      `,
      [body.planKey]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) {
      res.status(404).json({ error: "Plan no encontrado." });
      return;
    }
    await pool.query(
      `
      INSERT INTO sa.plan_service_limits (plan_id, service_key, is_unlimited, max_value, unit_price, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (plan_id, service_key)
      DO UPDATE SET is_unlimited = EXCLUDED.is_unlimited,
                    max_value = EXCLUDED.max_value,
                    unit_price = EXCLUDED.unit_price,
                    updated_at = NOW()
      `,
      [
        planId,
        body.serviceKey,
        Boolean(body.isUnlimited),
        body.maxValue === undefined ? null : body.maxValue,
        Number.isFinite(body.unitPrice as number) ? Number(body.unitPrice) : 0,
      ]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saSetTenantModuleHandler(req: Request, res: Response) {
  const schema = z.object({
    tenantId: TenantId,
    moduleKey: z.string().min(1),
    enabled: z.boolean(),
  });
  try {
    const body = schema.parse(req.body || {});
    const result = await setTenantModule(body.tenantId, body.moduleKey, body.enabled);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saAssignPlanHandler(req: Request, res: Response) {
  const schema = z.object({
    tenantId: TenantId,
    planKey: z.string().min(1),
  });
  try {
    const body = schema.parse(req.body || {});
    const result = await assignTenantPlan(body.tenantId, body.planKey);
    const snapshot = await buildTenantPlanSnapshot(body.tenantId);
    res.status(200).json({ ...result, snapshot });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}

export async function saTenantSummaryHandler(req: Request, res: Response) {
  try {
    const tenantId = TenantId.parse(Number(req.query.tenantId));
    const period = typeof req.query.period === "string" ? req.query.period : "";
    const periodKey = period ? PeriodKey.parse(period) : undefined;
    const summary = await getTenantMonthlySummary(tenantId, periodKey);
    res.status(200).json(summary);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "summary_error" });
  }
}

export async function saResetCountersHandler(req: Request, res: Response) {
  const schema = z.object({
    tenantId: TenantId,
    periodKey: PeriodKey,
  });
  try {
    const body = schema.parse(req.body || {});
    const result = await resetTenantCounters(body.tenantId, body.periodKey);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "reset_error" });
  }
}
