import { ensureOrganization, ensureSyncCheckpointTable, getOrgId, getPool } from "../db";

export type SyncCheckpoint = {
  entity: string;
  lastStart: number;
  total: number | null;
  updatedAt: string;
};

async function ensureReady() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureSyncCheckpointTable(pool);
  return { pool, orgId };
}

export async function getSyncCheckpoint(entity: string): Promise<SyncCheckpoint | null> {
  const { pool, orgId } = await ensureReady();
  const result = await pool.query(
    `
    SELECT entity, last_start, total, updated_at
    FROM sync_checkpoints
    WHERE organization_id = $1 AND entity = $2
    LIMIT 1
    `,
    [orgId, entity]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0] as {
    entity: string;
    last_start: number;
    total: number | null;
    updated_at: Date;
  };
  return {
    entity: row.entity,
    lastStart: Number(row.last_start) || 0,
    total: row.total === null ? null : Number(row.total),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function saveSyncCheckpoint(input: {
  entity: string;
  lastStart: number;
  total: number | null;
}) {
  const { pool, orgId } = await ensureReady();
  await pool.query(
    `
    INSERT INTO sync_checkpoints (organization_id, entity, last_start, total, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (organization_id, entity)
    DO UPDATE SET last_start = EXCLUDED.last_start, total = EXCLUDED.total, updated_at = NOW()
    `,
    [orgId, input.entity, input.lastStart, input.total]
  );
}

export async function clearSyncCheckpoint(entity: string) {
  const { pool, orgId } = await ensureReady();
  await pool.query(
    `
    DELETE FROM sync_checkpoints
    WHERE organization_id = $1 AND entity = $2
    `,
    [orgId, entity]
  );
}
