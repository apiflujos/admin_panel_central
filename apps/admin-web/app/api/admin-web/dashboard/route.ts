import { NextResponse } from "next/server";

import { toAdminWebDashboardOverviewDto } from "../../../../../../packages/domain/src/dashboard";
import { summarizeConnectionHealth } from "../../../../../../packages/domain/src/settings";
import { getOrgId, getPool } from "../../../../../../src/db";
import { getCompanyProfile } from "../../../../../../src/services/company.service";
import { listSyncLogs } from "../../../../../../src/services/logs.service";
import { listOrders } from "../../../../../../src/services/orders.service";
import { listProducts } from "../../../../../../src/services/products.service";
import { listStoreConnections } from "../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

async function countEnabledModules() {
  const pool = getPool();
  const tenantId = getOrgId();
  const rows = await pool.query<{ key: string }>(
    `
    SELECT md.key
    FROM sa.module_definitions md
    LEFT JOIN sa.tenant_modules tm
      ON tm.module_key = md.key AND tm.tenant_id = $1
    WHERE md.active = true
      AND COALESCE(tm.enabled, true) = true
    `,
    [tenantId]
  );
  return rows.rows.length;
}

export const GET = routeHandler(async () => {
  await requireRouteAdmin();

  const [company, connections, moduleCount, products, orders, logs] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
    listProducts({ limit: 3, offset: 0 }),
    listOrders({ limit: 3, offset: 0 }),
    listSyncLogs({}),
  ]);

  const { activeConnections, pendingActions } = summarizeConnectionHealth(connections);

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
