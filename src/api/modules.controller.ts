import type { Request, Response } from "express";
import { getOrgId, getPool } from "../db";

export async function listTenantModulesHandler(_req: Request, res: Response) {
  try {
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
    res.status(200).json({
      items: rows.rows.map((r) => ({
        key: r.key,
        name: r.name,
        active: Boolean(r.active),
        enabled: Boolean(r.enabled) && Boolean(r.active),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
