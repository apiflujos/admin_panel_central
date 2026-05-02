import { NextResponse } from "next/server";

import { getPool } from "../../../../../../src/db";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
  const pool = getPool();
  const tenants = await pool.query<{ id: number; name: string }>(
    `
    SELECT id, name
    FROM organizations
    ORDER BY id ASC
    `
  );
  return NextResponse.json({ items: tenants.rows }, { status: 200 });
});
