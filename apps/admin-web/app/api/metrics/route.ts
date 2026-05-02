import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../src/services/logs.service";
import { getMetrics, type MetricsRange } from "../../../../../src/services/metrics.service";
import { routeHandler } from "../../../lib/route-handler";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

function isMetricsRange(value: string): value is MetricsRange {
  return value === "day" || value === "week" || value === "month";
}

export const GET = routeHandler(async (req: Request) => {
  try {
    const searchParams = new URL(req.url).searchParams;
    const raw = typeof searchParams.get("range") === "string" ? String(searchParams.get("range") || "") : "";
    const range = isMetricsRange(raw) ? raw : undefined;
    const shopDomain = typeof searchParams.get("shopDomain") === "string" ? String(searchParams.get("shopDomain") || "").trim() : "";
    const result = await getMetrics({ range, shopDomain: shopDomain || undefined });
    await safeCreateLog({
      entity: "metrics_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Metricas cargadas",
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    await safeCreateLog({
      entity: "metrics_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
