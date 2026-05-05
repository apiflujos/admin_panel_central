import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { copyStoreConfig } from "../../../../../../../src/services/store-configs.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const POST = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const storeKey = String(params.storeKey || "");
  try {
    const payload = (await req.json()) as { sourceStoreId?: number; blocks?: string[] };
    const result = await copyStoreConfig(storeKey, payload);
    await createSyncLog({
      entity: "store_configs_copy",
      direction: "shopify->alegra",
      status: "success",
      message: "Store config copiado",
      request: { storeKey, sourceStoreId: payload.sourceStoreId, blocks: payload.blocks },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "store_configs_copy",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { storeKey },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
