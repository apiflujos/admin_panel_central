import { NextResponse } from "next/server";

import { toAdminWebSuperAdminOverviewDto } from "../../../../../../../packages/domain/src/superadmin";
import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../../../../../../../src/db";
import { listModules } from "../../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

type SaUserRow = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: Date;
};

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();

  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);

  const [tenants, plans, services, modules, users] = await Promise.all([
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM organizations`),
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM sa.plan_definitions`),
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM sa.limit_definitions`),
    listModules(),
    pool.query<SaUserRow>(
      `
      SELECT id, email, name, phone, created_at
      FROM users
      WHERE organization_id = $1 AND is_super_admin = true
      ORDER BY created_at DESC
      `,
      [orgId]
    ),
  ]);

  return NextResponse.json(
    toAdminWebSuperAdminOverviewDto({
      tenantsCount: Number(tenants.rows[0]?.total || 0),
      plansCount: Number(plans.rows[0]?.total || 0),
      servicesCount: Number(services.rows[0]?.total || 0),
      modulesCount: modules.length,
      users: users.rows,
    })
  );
});
