import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../src/services/logs.service";
import { listStoreConfigs } from "../../../../../src/services/store-configs.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const result = await listStoreConfigs();
    await createSyncLog({
      entity: "store_configs_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Store configs cargados",
      response: { count: result.length },
    });
    return NextResponse.json({ items: result });
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "store_configs_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
