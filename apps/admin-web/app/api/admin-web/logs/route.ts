import { NextResponse } from "next/server";

import { toAdminWebLogsListDto } from "../../../../../../packages/domain/src/logs";
import { listSyncLogs } from "../../../../../../src/services/logs.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;

  const data = await listSyncLogs(
    {
      status: searchParams.get("status") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      entity: searchParams.get("entity") ?? undefined,
      direction: searchParams.get("direction") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    },
    {
      limit: Number(searchParams.get("limit")),
      offset: Number(searchParams.get("offset")),
    }
  );

  return NextResponse.json(toAdminWebLogsListDto(data));
});
