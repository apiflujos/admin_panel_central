import type { Request, Response } from "express";
import { z } from "zod";
import { getTenantMonthlySummary } from "../sa/sa.admin.service";
import { buildTenantPlanSnapshot } from "../sa/sa.repository";
import { getPool } from "../db";

const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);

export async function billingSummaryHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as { organization_id?: number; role?: string } | undefined;
    if (!user) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const orgId = Number(user.organization_id);
    const period = typeof req.query.period === "string" ? req.query.period : "";
    const periodKey = period ? PeriodKey.parse(period) : undefined;
    const summary = await getTenantMonthlySummary(orgId, periodKey);
    const plan = await buildTenantPlanSnapshot(orgId);
    const pool = getPool();
    const billed = await pool.query<{ qty: string; total: string }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN unit_price > 0 THEN quantity ELSE 0 END), 0)::text AS qty,
        COALESCE(SUM(total), 0)::text AS total
      FROM sa.billing_events
      WHERE tenant_id = $1 AND period_key = $2
      `,
      [orgId, summary.periodKey]
    );
    const billedEvents = Number(billed.rows[0]?.qty || 0) || 0;
    const billedTotal = Number(billed.rows[0]?.total || 0) || 0;

    res.status(200).json({
      ...summary,
      billedEvents,
      billedTotal,
      planKey: plan.planKey,
      planName: plan.planKey === "on_demand" ? "On Demand" : plan.planKey === "pro" ? "Pro" : "Master",
      planType: plan.planType,
      monthlyPrice: plan.monthlyPrice,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "billing_error" });
  }
}
