import { NextResponse } from "next/server";

import { summarizeConnectionHealth, toSettingsOverviewDto } from "../../../../../../../packages/domain/src/settings";
import { countEnabledModules } from "../../../../../../../apps/integration-api/src/modules/settings/handlers/support/tenant-modules";
import { getCompanyProfile } from "../../../../../../../src/services/company.service";
import { listStoreConnections } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();

  const [company, connections, moduleCount] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
  ]);

  const { activeConnections, pendingActions } =
    summarizeConnectionHealth(connections);

  return NextResponse.json(
    toSettingsOverviewDto({
      companyName: company.name || "ApiFlujos",
      moduleCount,
      activeConnections,
      pendingActions,
    })
  );
});
