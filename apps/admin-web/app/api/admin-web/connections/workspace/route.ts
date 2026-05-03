import { NextResponse } from "next/server";

import { getServerConnectionsWorkspace } from "../../../../../lib/server-api";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  const workspace = await getServerConnectionsWorkspace();
  return NextResponse.json(workspace);
});
