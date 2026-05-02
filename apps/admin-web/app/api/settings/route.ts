import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../src/services/logs.service";
import { getSettings as getSettingsService, saveSettings } from "../../../../../src/services/settings.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

const summarizeSettingsPayload = (payload: Record<string, unknown>) => ({
  hasShopify: Boolean((payload.shopify as Record<string, unknown> | undefined)?.accessToken),
  hasAlegra: Boolean((payload.alegra as Record<string, unknown> | undefined)?.apiKey),
  hasWooCommerce: Boolean((payload.woocommerce as Record<string, unknown> | undefined)?.consumerKey),
  hasAi: Boolean((payload.ai as Record<string, unknown> | undefined)?.apiKey),
  hasAdsApps: Boolean(payload.adsApps),
  hasRules: Boolean(payload.rules),
  hasInvoice: Boolean(payload.invoice),
  hasTaxRules: Boolean(payload.taxRules),
  hasPaymentMappings: Boolean(payload.paymentMappings),
});

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const result = await getSettingsService();
    await safeCreateLog({
      entity: "settings_get",
      direction: "shopify->alegra",
      status: "success",
      message: "Settings cargados",
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "settings_get",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const PUT = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const result = await saveSettings(body);
    await safeCreateLog({
      entity: "settings_update",
      direction: "shopify->alegra",
      status: "success",
      message: "Settings guardados",
      request: summarizeSettingsPayload(body),
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "settings_update",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: summarizeSettingsPayload(body),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
