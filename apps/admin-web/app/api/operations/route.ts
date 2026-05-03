import { NextResponse } from "next/server";

import { normalizeOperationsDays, toAdminWebOperationsListDto } from "../../../../../packages/domain/src/operations";
import { createSyncLog } from "../../../../../src/services/logs.service";
import { listOperations } from "../../../../../src/services/operations.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const searchParams = new URL(req.url).searchParams;
    const result = await listOperations(normalizeOperationsDays({ days: searchParams.get("days") ?? undefined }));
    return NextResponse.json(toAdminWebOperationsListDto(result), { status: 200 });
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "operations_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { days: new URL(req.url).searchParams.get("days") ?? undefined },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
