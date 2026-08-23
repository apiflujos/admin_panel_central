import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../src/sa/sa.repository";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { upsertAlegraAccount } from "../../../../../../src/services/store-connections.service";
import {
  listWooConnections,
  upsertWooConnection,
} from "../../../../../../src/services/woocommerce-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

const moduleError = (moduleKey: string) => {
  const err = new Error(`Modulo ${moduleKey} desactivado por ApiFlujos.`);
  (err as { statusCode?: number }).statusCode = 403;
  return err;
};

async function assertModuleEnabled(moduleKey: string) {
  const enabled = await isTenantModuleEnabled(getOrgId(), moduleKey);
  if (!enabled) {
    throw moduleError(moduleKey);
  }
}

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const result = await listWooConnections();
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "woocommerce_connections_list",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
    const status = /timeout|econn|ENOTFOUND|EAI_AGAIN|no disponible/i.test(message) ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    await assertModuleEnabled("woocommerce");
    const payload = (await req.json()) as Record<string, any>;
    const storeIdRaw = payload?.storeId;
    const storeIdCoerced = storeIdRaw == null || storeIdRaw === "" ? NaN : Number(storeIdRaw);
    const storeId = Number.isFinite(storeIdCoerced) && storeIdCoerced > 0 ? storeIdCoerced : undefined;
    const alegraIdRaw = payload?.alegraAccountId;
    const alegraIdCoerced = alegraIdRaw == null || alegraIdRaw === "" ? NaN : Number(alegraIdRaw);
    const alegraAccountId = Number.isFinite(alegraIdCoerced) && alegraIdCoerced > 0 ? alegraIdCoerced : undefined;
    const result = await upsertWooConnection({
      storeName: payload?.storeName || "",
      storeId,
      shopDomain: payload?.woocommerce?.shopDomain || payload?.shopDomain || "",
      consumerKey: payload?.woocommerce?.consumerKey || payload?.consumerKey || "",
      consumerSecret: payload?.woocommerce?.consumerSecret || payload?.consumerSecret || "",
    });
    if (storeId && alegraAccountId) {
      await upsertAlegraAccount({ accountId: alegraAccountId, storeId });
    }
    const list = await listWooConnections();
    await createSyncLog({
      entity: "woocommerce_connections_create",
      direction: "woocommerce->alegra",
      status: "success",
      message: "Conexion WooCommerce creada",
      request: { shopDomain: payload?.woocommerce?.shopDomain || payload?.shopDomain },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json({ created: result, ...list });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = (error as { statusCode?: number }).statusCode || 400;
    await createSyncLog({
      entity: "woocommerce_connections_create",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status });
  }
});
