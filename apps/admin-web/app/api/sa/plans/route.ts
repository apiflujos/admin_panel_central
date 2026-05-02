import { NextResponse } from "next/server";

import { getPool } from "../../../../../../src/db";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
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
  return NextResponse.json({
    items: plans.rows.map((p) => ({
      key: p.key,
      name: p.name,
      planType: p.plan_type,
      monthlyPrice: Number(p.monthly_price || 0),
      active: Boolean(p.active),
    })),
  });
});
