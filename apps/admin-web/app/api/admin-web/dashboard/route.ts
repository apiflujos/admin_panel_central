import { NextResponse } from "next/server";

import { toAdminWebDashboardOverviewDto } from "../../../../../../packages/domain/src/dashboard";
import { summarizeConnectionHealth } from "../../../../../../packages/domain/src/settings";
import { countEnabledModules } from "../../../../../../apps/integration-api/src/modules/settings/handlers/support/tenant-modules";
import { getCompanyProfile } from "../../../../../../src/services/company.service";
import { listSyncLogs } from "../../../../../../src/services/logs.service";
import { listOrders } from "../../../../../../src/services/orders.service";
import { listProducts } from "../../../../../../src/services/products.service";
import { listStoreConnections } from "../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();

  const [company, connections, moduleCount, products, orders, logs] =
    await Promise.all([
      getCompanyProfile(),
      listStoreConnections(),
      countEnabledModules(),
      listProducts({ limit: 3, offset: 0 }),
      listOrders({ limit: 3, offset: 0 }),
      listSyncLogs({}),
    ]);

  const { activeConnections, pendingActions } =
    summarizeConnectionHealth(connections);

  return NextResponse.json(
    toAdminWebDashboardOverviewDto({
      settings: {
        companyName: company.name || "ApiFlujos",
        moduleCount,
        activeConnections,
        pendingActions,
      },
      products,
      orders,
      logs,
    })
  );
});
