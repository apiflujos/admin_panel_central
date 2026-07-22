import { NextResponse } from "next/server";

import { getOrgId, getPool } from "../../../../../../src/db";
import { requireRouteAdmin } from "../../../../lib/route-auth";
import { routeHandler } from "../../../../lib/route-handler";

/**
 * GET /api/admin-web/retry-queue?status=failed|pending|processing|done|all
 * Returns rows del retry queue del org actual, con detalles del sync_log asociado.
 * Usado por la UI de admin-web para dar visibilidad a los dead-letters (rows en `failed`).
 */
export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const pool = getPool();
  const orgId = getOrgId();
  const url = new URL(req.url);
  const statusFilterRaw = String(url.searchParams.get("status") || "failed").toLowerCase();
  const validStatuses = new Set(["pending", "processing", "done", "skipped", "failed", "all"]);
  const statusFilter = validStatuses.has(statusFilterRaw) ? statusFilterRaw : "failed";
  const limitRaw = Number(url.searchParams.get("limit") || 100);
  const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 100, 500));

  const clauses: string[] = ["sl.organization_id = $1"];
  const values: Array<string | number> = [orgId];
  if (statusFilter !== "all") {
    values.push(statusFilter);
    clauses.push(`rq.status = $${values.length}`);
  }
  values.push(limit);

  const rows = await pool.query<{
    id: number;
    status: string;
    next_run_at: string | null;
    updated_at: string | null;
    sync_log_id: number;
    entity: string;
    log_status: string;
    log_message: string | null;
    retry_count: number;
    created_at: string;
  }>(
    `
    SELECT
      rq.id,
      rq.status,
      rq.next_run_at,
      rq.updated_at,
      rq.sync_log_id,
      sl.entity,
      sl.status AS log_status,
      sl.message AS log_message,
      sl.retry_count,
      sl.created_at
    FROM retry_queue rq
    JOIN sync_logs sl ON sl.id = rq.sync_log_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY rq.updated_at DESC NULLS LAST, rq.next_run_at DESC NULLS LAST
    LIMIT $${values.length}
    `,
    values
  );

  const summary = await pool.query<{ status: string; count: number }>(
    `
    SELECT rq.status, COUNT(*)::int AS count
    FROM retry_queue rq
    JOIN sync_logs sl ON sl.id = rq.sync_log_id
    WHERE sl.organization_id = $1
    GROUP BY rq.status
    `,
    [orgId]
  );

  return NextResponse.json({
    filter: statusFilter,
    limit,
    summary: summary.rows,
    rows: rows.rows.map((row) => ({
      id: row.id,
      status: row.status,
      entity: row.entity,
      syncLogId: row.sync_log_id,
      logStatus: row.log_status,
      logMessage: row.log_message,
      retryCount: row.retry_count,
      nextRunAt: row.next_run_at,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })),
  });
});

/**
 * POST /api/admin-web/retry-queue con { action: "requeue" | "abandon", id: number }
 * `requeue` mueve una row `failed` de vuelta a `pending` para que el worker la reintente.
 * `abandon` marca una row como `skipped` para sacarla de la cola manualmente.
 */
export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const pool = getPool();
  const orgId = getOrgId();
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; id?: unknown };
  const action = String(body.action || "");
  const idRaw = body.id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  if (action !== "requeue" && action !== "abandon") {
    return NextResponse.json({ error: "action debe ser 'requeue' o 'abandon'" }, { status: 400 });
  }

  const owned = await pool.query<{ id: number }>(
    `
    SELECT rq.id
    FROM retry_queue rq
    JOIN sync_logs sl ON sl.id = rq.sync_log_id
    WHERE rq.id = $1 AND sl.organization_id = $2
    LIMIT 1
    `,
    [id, orgId]
  );
  if (!owned.rows.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "requeue") {
    await pool.query(
      `UPDATE retry_queue SET status = 'pending', next_run_at = NOW() WHERE id = $1`,
      [id]
    );
  } else {
    await pool.query(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [id]);
  }
  return NextResponse.json({ ok: true, id, action });
});
