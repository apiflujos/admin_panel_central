import { NextResponse } from "next/server";

import { normalizeMarketingDashboardFilters } from "../../../../../../packages/domain/src/marketing";
import { generateMarketingInsights } from "../../../../../../src/marketing/ai/marketing-ai.service";
import { getMarketingExecutiveDashboard } from "../../../../../../src/marketing/reports/marketing-reports.service";
import { listStoreConnections } from "../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../lib/route-handler";

async function resolveDefaultMarketingShopDomain() {
  const connections = await listStoreConnections();
  for (const store of connections.storesCatalog) {
    if (store.shopify?.shopDomain) {
      return String(store.shopify.shopDomain);
    }
  }
  return "";
}

async function resolveMarketingDashboardFilters(query: Record<string, unknown>) {
  const requestedShopDomain =
    typeof query.shopDomain === "string" && query.shopDomain.trim()
      ? query.shopDomain
      : await resolveDefaultMarketingShopDomain();

  const filters = normalizeMarketingDashboardFilters({
    ...query,
    shopDomain: requestedShopDomain,
  });

  if (!filters.shopDomain) {
    throw new Error("shopDomain requerido");
  }

  return filters;
}

export const GET = routeHandler(async (req: Request) => {
  try {
    const searchParams = new URL(req.url).searchParams;
    const filters = await resolveMarketingDashboardFilters({
      shopDomain: searchParams.get("shopDomain") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    const dashboard = await getMarketingExecutiveDashboard(filters);
    const insights = generateMarketingInsights(dashboard);
    return NextResponse.json(
      {
        shopDomain: filters.shopDomain,
        from: filters.from,
        to: filters.to,
        insights,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "insights_error" }, { status: 400 });
  }
});
