import { NextResponse } from "next/server";

import { listModules } from "../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
  const items = await listModules();
  return NextResponse.json({ items }, { status: 200 });
});
