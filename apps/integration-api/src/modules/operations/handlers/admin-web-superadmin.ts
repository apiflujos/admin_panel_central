import type { Request, Response } from "express";

import { toAdminWebSuperAdminOverviewDto } from "../../../../../../packages/domain/src/superadmin";
import { getOrgId, getPool } from "../../../../../../src/db";
import { ensureOrganization, ensureUsersTables } from "../../../../../../src/db";
import { listModules } from "../../../../../../src/sa/sa.admin.service";

type SaUserRow = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: Date;
};

export async function getAdminWebSuperAdminOverviewHandler(_req: Request, res: Response) {
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

  const payload = toAdminWebSuperAdminOverviewDto({
    tenantsCount: Number(tenants.rows[0]?.total || 0),
    plansCount: Number(plans.rows[0]?.total || 0),
    servicesCount: Number(services.rows[0]?.total || 0),
    modulesCount: modules.length,
    users: users.rows,
  });

  res.status(200).json(payload);
}
