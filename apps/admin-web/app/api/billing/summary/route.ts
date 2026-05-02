import { NextResponse } from "next/server";
import { z } from "zod";

import { getPool } from "../../../../../../src/db";
import { buildTenantPlanSnapshot } from "../../../../../../src/sa/sa.repository";
import { getTenantMonthlySummary } from "../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../lib/route-handler";
import { getRouteUser } from "../../../../lib/route-auth";

const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);

export const GET = routeHandler(async (req: Request) => {
  try {
    const user = await getRouteUser();
    if (!user) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const orgId = Number(user.organization_id);
    const period = new URL(req.url).searchParams.get("period") || "";
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

    return NextResponse.json({
      ...summary,
      billedEvents,
      billedTotal,
      planKey: plan.planKey,
      planName: plan.planKey === "on_demand" ? "On Demand" : plan.planKey === "pro" ? "Pro" : "Master",
      planType: plan.planType,
      monthlyPrice: plan.monthlyPrice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "billing_error" },
      { status: 400 }
    );
  }
});
