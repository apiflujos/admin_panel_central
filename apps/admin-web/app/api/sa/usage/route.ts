import { NextResponse } from "next/server";

import { getTenantMonthlySummary } from "../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  try {
    const searchParams = new URL(req.url).searchParams;
    const tenantId = Number(searchParams.get("tenantId"));
    const period = typeof searchParams.get("period") === "string" ? String(searchParams.get("period") || "") : "";
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error("invalid_request");
    }
    const summary = await getTenantMonthlySummary(tenantId, period || undefined);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "summary_error" }, { status: 400 });
  }
});
