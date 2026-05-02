import { NextResponse } from "next/server";

import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

async function ensureOAuthEnv() {
  const adsConfig = await getAdsAppConfig();
  const appId = adsConfig.metaAds.appId || "";
  const appSecret = adsConfig.metaAds.appSecret || "";
  const appHost = adsConfig.appHost || "";
  const missing: string[] = [];
  if (!appId) missing.push("Meta App ID");
  if (!appSecret) missing.push("Meta App Secret");
  if (!appHost) missing.push("Base URL");
  if (missing.length) {
    throw new Error(`Configuracion Meta Ads incompleta en Conexiones. Falta: ${missing.join(", ")}`);
  }
  return { appHost };
}

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const env = await ensureOAuthEnv();
    return NextResponse.json({ enabled: true, appHost: env.appHost, missing: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuracion invalida";
    const missing = message.includes("Falta:") ? message.split("Falta:")[1].trim().split(",") : [];
    return NextResponse.json({ enabled: false, missing, appHost: "" });
  }
});
