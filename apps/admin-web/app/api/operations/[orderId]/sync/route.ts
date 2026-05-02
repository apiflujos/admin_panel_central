import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { syncOperation } from "../../../../../../../src/services/operations.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {}
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const POST = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  try {
    const result = await syncOperation(orderId);
    await safeCreateLog({
      entity: "operation_sync",
      direction: "shopify->alegra",
      status: "success",
      message: "Operacion sincronizada",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "operation_sync",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
