import { NextResponse } from "next/server";

import { getPool } from "../../../../../../../src/db";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  try {
    const tenantId = Number(new URL(req.url).searchParams.get("tenantId"));
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error("invalid_request");
    }
    const pool = getPool();
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
