import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { emitPaymentForOrder } from "../../../../../../../src/services/operations-actions.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {}
};

export const POST = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  try {
    const result = await emitPaymentForOrder(orderId);
    await safeCreateLog({
      entity: "emit_payment",
      direction: "shopify->alegra",
      status: "success",
      message: "Pago emitido",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    await safeCreateLog({
      entity: "emit_payment",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
