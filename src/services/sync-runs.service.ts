import { ensureOrganization, ensureSyncRunsTable, getOrgId, getPool } from "../db";

export type SyncRunStatus = "running" | "completed" | "failed" | "canceled";

type SyncRunRow = {
  sync_id: string;
  sync_type: string;
  status: SyncRunStatus;
  cancel_requested: boolean;
};

async function ensureReady() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureSyncRunsTable(pool);
  return { pool, orgId };
}

export async function createSyncRun(syncId: string, syncType: string, meta?: Record<string, unknown>) {
  const { pool, orgId } = await ensureReady();
  await pool.query(
    `
    INSERT INTO sync_runs
      (organization_id, sync_id, sync_type, status, cancel_requested, started_at, meta_json)
    VALUES ($1, $2, $3, 'running', false, NOW(), $4)
    ON CONFLICT (organization_id, sync_id)
    DO UPDATE SET sync_type = EXCLUDED.sync_type,
                  status = 'running',
                  cancel_requested = false,
                  started_at = NOW(),
                  finished_at = NULL,
                  meta_json = EXCLUDED.meta_json
    `,
    [orgId, syncId, syncType, meta || null]
  );
}

export async function isSyncRunCancelRequested(syncId: string) {
  const { pool, orgId } = await ensureReady();
  const result = await pool.query<SyncRunRow>(
    `
    SELECT sync_id, sync_type, status, cancel_requested
    FROM sync_runs
    WHERE organization_id = $1 AND sync_id = $2
    LIMIT 1
    `,
    [orgId, syncId]
  );
  return Boolean(result.rows[0]?.cancel_requested);
}

export async function finishSyncRun(syncId: string, status: SyncRunStatus, meta?: Record<string, unknown>) {
  const { pool, orgId } = await ensureReady();
  await pool.query(
    `
    UPDATE sync_runs
    SET status = $3,
        finished_at = NOW(),
        meta_json = COALESCE($4, meta_json)
    WHERE organization_id = $1 AND sync_id = $2
    `,
    [orgId, syncId, status, meta || null]
  );
}

export async function requestSyncRunCancel(syncType: string, syncId?: string) {
  const { pool, orgId } = await ensureReady();
  if (syncId) {
    const result = await pool.query<{ sync_id: string }>(
      `
      UPDATE sync_runs
      SET cancel_requested = true
      WHERE organization_id = $1
        AND sync_type = $2
        AND sync_id = $3
        AND status = 'running'
      RETURNING sync_id
      `,
      [orgId, syncType, syncId]
    );
    return result.rows[0]?.sync_id || null;
  }

  const result = await pool.query<{ sync_id: string }>(
    `
    WITH target AS (
      SELECT sync_id
      FROM sync_runs
      WHERE organization_id = $1
        AND sync_type = $2
        AND status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    )
    UPDATE sync_runs sr
    SET cancel_requested = true
    FROM target
    WHERE sr.organization_id = $1
      AND sr.sync_type = $2
      AND sr.sync_id = target.sync_id
    RETURNING sr.sync_id
    `,
    [orgId, syncType]
  );
  return result.rows[0]?.sync_id || null;
}
