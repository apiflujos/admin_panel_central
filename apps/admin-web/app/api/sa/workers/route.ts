import { NextResponse } from "next/server";

import { listWorkerSettings } from "../../../../../../src/services/worker-settings.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
  const items = await listWorkerSettings();
  return NextResponse.json({ items }, { status: 200 });
});
