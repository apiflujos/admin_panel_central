import { getOrgId, getPool } from "../../../../../../../src/db";

export async function countEnabledModules() {
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
