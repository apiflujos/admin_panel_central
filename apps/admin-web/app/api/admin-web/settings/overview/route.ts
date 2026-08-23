import { NextResponse } from "next/server";

import { summarizeConnectionHealth, toSettingsOverviewDto } from "../../../../../../../packages/domain/src/settings";
import { getOrgId, getPool } from "../../../../../../../src/db";
import { getCompanyProfile } from "../../../../../../../src/services/company.service";
import { listStoreConnections } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

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

  const [company, connections, moduleCount] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
  ]);

  const { activeConnections, pendingActions } = summarizeConnectionHealth(connections);

  return NextResponse.json(
    toSettingsOverviewDto({
      companyName: company.name || "ApiFlujos",
      moduleCount,
      activeConnections,
      pendingActions,
    })
  );
});
