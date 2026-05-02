import { NextResponse } from "next/server";
import { z } from "zod";

import { resetTenantCounters } from "../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

const TenantId = z.number().int().positive();
const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  const schema = z.object({
    tenantId: TenantId,
    periodKey: PeriodKey,
  });
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const result = await resetTenantCounters(body.tenantId, body.periodKey);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "reset_error" }, { status: 400 });
  }
});
