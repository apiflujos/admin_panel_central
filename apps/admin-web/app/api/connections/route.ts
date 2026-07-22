import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../src/sa/sa.repository";
import { createSyncLog } from "../../../../../src/services/logs.service";
import {
  listStoreConnections,
  upsertAlegraAccount,
  upsertStoreConnection,
} from "../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

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
    const result = await listStoreConnections();
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "connections_list",
      direction: "shopify->alegra",
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
    const payload = (await req.json()) as Record<string, any>;
    if (payload?.shopify?.shopDomain || payload?.shopify?.accessToken) {
      await assertModuleEnabled("shopify");
    }
    if (payload?.alegra) {
      await assertModuleEnabled("alegra");
    }
    let result: Record<string, unknown> = {};
    const shopDomain = payload?.shopify?.shopDomain || "";
    const storeIdRaw = payload?.storeId;
    const storeIdCoerced = storeIdRaw == null || storeIdRaw === "" ? NaN : Number(storeIdRaw);
    const storeId = Number.isFinite(storeIdCoerced) && storeIdCoerced > 0 ? storeIdCoerced : undefined;
    if (shopDomain && !storeId) {
      throw new Error("Selecciona una tienda para conectar Shopify.");
    }
    if (shopDomain) {
      result = await upsertStoreConnection({
        storeName: payload?.storeName || "",
        shopDomain,
        accessToken: payload?.shopify?.accessToken || "",
        alegra: payload?.alegra || undefined,
        storeId,
      });
    } else if (payload?.alegra) {
      result = await upsertAlegraAccount({
        ...(payload.alegra || {}),
        storeId,
      });
    } else {
      throw new Error("Conexion invalida");
    }
    const list = await listStoreConnections();
    await createSyncLog({
      entity: "connections_create",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexion creada",
      request: { shopDomain: payload?.shopify?.shopDomain },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json({ created: result, ...list });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = (error as { statusCode?: number }).statusCode || 400;
    await createSyncLog({
      entity: "connections_create",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status });
  }
});
