import { NextResponse } from "next/server";

import { toAdminWebMarketingOverviewDto } from "../../../../../../../packages/domain/src/marketing";
import { getMarketingExecutiveDashboard } from "../../../../../../../src/marketing/reports/marketing-reports.service";
import { resolveMarketingDashboardFilters } from "../../../../../../integration-api/src/modules/operations/handlers/support/marketing-dashboard-filters";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  try {
    const searchParams = new URL(req.url).searchParams;
    const filters = await resolveMarketingDashboardFilters(
      {
        shopDomain: searchParams.get("shopDomain") ?? undefined,
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
      },
      { autofillShopDomain: true }
    );
    const result = await getMarketingExecutiveDashboard(filters);
    return NextResponse.json(toAdminWebMarketingOverviewDto(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "dashboard_error";
    const status = message === "shopDomain requerido" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
