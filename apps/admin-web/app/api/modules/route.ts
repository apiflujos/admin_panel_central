import { NextResponse } from "next/server";

import { getOrgId, getPool } from "../../../../../src/db";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  const pool = getPool();
  const tenantId = getOrgId();
  const rows = await pool.query<{ key: string; name: string; active: boolean; enabled: boolean }>(
    `
    SELECT
      md.key,
      md.name,
      md.active,
      COALESCE(tm.enabled, true) AS enabled
    FROM sa.module_definitions md
    LEFT JOIN sa.tenant_modules tm
      ON tm.module_key = md.key AND tm.tenant_id = $1
    ORDER BY md.key ASC
    `,
    [tenantId]
  );
  return NextResponse.json({
    items: rows.rows.map((r) => ({
      key: r.key,
      name: r.name,
      active: Boolean(r.active),
      enabled: Boolean(r.enabled) && Boolean(r.active),
    })),
  });
});
