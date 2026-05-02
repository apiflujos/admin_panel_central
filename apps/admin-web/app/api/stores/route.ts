import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../src/services/logs.service";
import { createStore, listStores } from "../../../../../src/services/stores.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const result = await listStores();
    await createSyncLog({
      entity: "stores_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Tiendas cargadas",
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "stores_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const result = await createStore(name);
    await createSyncLog({
      entity: "stores_create",
      direction: "shopify->alegra",
      status: "success",
      message: "Tienda creada",
      request: { name },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json({ created: result });
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "stores_create",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
