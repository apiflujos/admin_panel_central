import { NextResponse } from "next/server";

import { assignTenantPlan, buildTenantPlanSnapshot } from "../../../../../../../src/sa/sa.repository";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  const body = (await req.json()) as Record<string, unknown>;
  const tenantId = Number(body.tenantId);
  const planKey = String(body.planKey || "");
  if (!Number.isInteger(tenantId) || tenantId <= 0 || !planKey) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const result = await assignTenantPlan(tenantId, planKey);
    const snapshot = await buildTenantPlanSnapshot(tenantId);
    return NextResponse.json({ ...result, snapshot }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
