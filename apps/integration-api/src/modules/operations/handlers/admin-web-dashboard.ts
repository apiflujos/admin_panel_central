import type { Request, Response } from "express";

import { toAdminWebDashboardOverviewDto } from "../../../../../../packages/domain/src/dashboard";
import { summarizeConnectionHealth } from "../../../../../../packages/domain/src/settings";
import { getCompanyProfile } from "../../../../../../src/services/company.service";
import { listSyncLogs } from "../../../../../../src/services/logs.service";
import { listOrders } from "../../../../../../src/services/orders.service";
import { listProducts } from "../../../../../../src/services/products.service";
import { listStoreConnections } from "../../../../../../src/services/store-connections.service";
import { countEnabledModules } from "../../settings/handlers/support/tenant-modules";

export async function getAdminWebDashboardHandler(_req: Request, res: Response) {
  const [company, connections, moduleCount, products, orders, logs] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
    listProducts({ limit: 3, offset: 0 }),
    listOrders({ limit: 3, offset: 0 }),
    listSyncLogs({}),
  ]);

  const { activeConnections, pendingActions } = summarizeConnectionHealth(connections);

  const payload = toAdminWebDashboardOverviewDto({
    settings: {
      companyName: company.name || "ApiFlujos",
      moduleCount,
      activeConnections,
      pendingActions,
    },
    products,
    orders,
    logs,
  });

  res.status(200).json(payload);
}
