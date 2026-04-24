import { getOrgId, getPool } from "../db";

export type IdempotencyStatus = "processing" | "completed" | "failed";

export async function acquireIdempotencyKey(key: string): Promise<{ status: IdempotencyStatus; acquired: boolean }> {
  const pool = getPool();
  const orgId = getOrgId();

  const insert = await pool.query<{ status: IdempotencyStatus }>(
    `
    INSERT INTO idempotency_keys (organization_id, key, status)
    VALUES ($1, $2, 'processing')
    ON CONFLICT (organization_id, key)
    DO NOTHING
    RETURNING status
    `,
    [orgId, key]
  );
  if (insert.rows.length) {
    return { status: "processing", acquired: true };
  }

  const existing = await pool.query<{ status: IdempotencyStatus; updated_at: Date | null }>(
    `
    SELECT status, updated_at
    FROM idempotency_keys
    WHERE organization_id = $1 AND key = $2
    `,
    [orgId, key]
  );
  const status = existing.rows[0]?.status || "processing";
  const updatedAt = existing.rows[0]?.updated_at;
  const staleProcessing =
    status === "processing" && updatedAt && Date.now() - new Date(updatedAt).getTime() > 15 * 60 * 1000;

  if (status !== "failed" && !staleProcessing) {
    return { status, acquired: false };
  }

  const retryCondition = status === "failed" ? "status = 'failed'" : "status = 'processing'";
  const update = await pool.query<{ status: IdempotencyStatus }>(
    `
    UPDATE idempotency_keys
    SET status = 'processing', updated_at = NOW()
    WHERE organization_id = $1 AND key = $2 AND ${retryCondition}
    RETURNING status
    `,
    [orgId, key]
  );
  return { status: update.rows[0]?.status || "processing", acquired: update.rows.length > 0 };
}

export async function markIdempotencyKey(key: string, status: IdempotencyStatus, lastError?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  await pool.query(
    `
    UPDATE idempotency_keys
    SET status = $3, last_error = $4, updated_at = NOW()
    WHERE organization_id = $1 AND key = $2
    `,
    [orgId, key, status, lastError || null]
  );
}
