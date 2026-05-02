import { NextResponse } from "next/server";

import { saveConnectionTest } from "../../../../../../src/services/connection-tests.service";
import { validateConnections } from "../../../../../../src/services/connectivity.service";
import { createSyncLog } from "../../../../../../src/services/logs.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

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

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const result = await validateConnections(body);
    if (Array.isArray(result.results)) {
      await Promise.all(
        result.results.map((entry) =>
          saveConnectionTest({
            provider: entry.provider,
            status: entry.status,
            message: entry.message || null,
            request: summarizeSettingsPayload(body),
            response: { status: entry.status, message: entry.message || null },
          }).catch(() => undefined)
        )
      );
    }
    await safeCreateLog({
      entity: "connections_test",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexiones probadas",
      request: summarizeSettingsPayload(body),
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "connections_test",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: summarizeSettingsPayload(body),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
