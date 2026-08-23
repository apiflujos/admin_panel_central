import { NextResponse } from "next/server";

import { normalizeOperationsDays, toAdminWebOperationsListDto } from "../../../../../../packages/domain/src/operations";
import { listOperations } from "../../../../../../src/services/operations.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;
  const result = await listOperations(normalizeOperationsDays({ days: searchParams.get("days") ?? undefined }));

  return NextResponse.json(toAdminWebOperationsListDto(result));
});
