import type { Request, Response } from "express";
import { z } from "zod";
import { getPool } from "../db";
import { assignTenantPlan, buildTenantPlanSnapshot } from "../sa/sa.repository";
import { getTenantMonthlySummary, listModules, resetTenantCounters, setTenantModule } from "../sa/sa.admin.service";

const TenantId = z.number().int().positive();
const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);

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
