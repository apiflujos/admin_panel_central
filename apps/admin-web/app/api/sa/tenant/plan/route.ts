import { NextResponse } from "next/server";

import { buildTenantPlanSnapshot } from "../../../../../../../src/sa/sa.repository";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  try {
    const tenantId = Number(new URL(req.url).searchParams.get("tenantId"));
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error("invalid_request");
    }
    const snapshot = await buildTenantPlanSnapshot(tenantId);
    return NextResponse.json({ ok: true, snapshot }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
