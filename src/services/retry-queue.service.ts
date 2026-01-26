import { getOrgId, getPool } from "../db";
import { retryInvoiceFromLog } from "./operations.service";

type RetryRow = {
  id: number;
  sync_log_id: number;
  entity: string;
  request_json: Record<string, unknown> | null;
  retry_count: number;
};

export async function processRetryQueue(limit = 50) {
  const pool = getPool();
  const orgId = getOrgId();

  const client = await pool.connect();
  let rows: RetryRow[] = [];
  try {
    await client.query("BEGIN");
    const result = await client.query<RetryRow>(
      `
      SELECT rq.id, rq.sync_log_id, sl.entity, sl.request_json, sl.retry_count
      FROM retry_queue rq
      JOIN sync_logs sl ON sl.id = rq.sync_log_id
      WHERE sl.organization_id = $1
        AND rq.status = 'pending'
        AND rq.next_run_at <= NOW()
      ORDER BY rq.next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $2
      `,
      [orgId, limit]
    );
    rows = result.rows;
    if (rows.length) {
      await client.query(
        `UPDATE retry_queue SET status = 'processing' WHERE id = ANY($1::int[])`,
        [rows.map((row) => row.id)]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!rows.length) {
    return { processed: 0 };
  }

  const maxRetries = Number(process.env.RETRY_QUEUE_MAX_RETRIES || 5);
  const baseDelaySec = Number(process.env.RETRY_QUEUE_BASE_DELAY_SEC || 300);

  for (const row of rows) {
    const orderId = row.request_json?.orderId;
    if (row.entity !== "order" || (typeof orderId !== "string" && typeof orderId !== "number")) {
      await pool.query(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [
        row.id,
      ]);
      continue;
    }

    try {
      await retryInvoiceFromLog(String(orderId));
      await pool.query(`UPDATE retry_queue SET status = 'done' WHERE id = $1`, [row.id]);
    } catch (error) {
      const nextRetryCount = row.retry_count + 1;
      if (nextRetryCount >= maxRetries) {
        await pool.query(
          `UPDATE retry_queue SET status = 'failed' WHERE id = $1`,
          [row.id]
        );
        continue;
      }
      const delaySec = baseDelaySec * Math.pow(2, Math.min(nextRetryCount, 4));
      await pool.query(
        `
        UPDATE retry_queue
        SET status = 'pending', next_run_at = NOW() + ($2 * INTERVAL '1 second')
        WHERE id = $1
        `,
        [row.id, Math.round(delaySec)]
      );
      await pool.query(
        `
        UPDATE sync_logs
        SET retry_count = retry_count + 1
        WHERE id = $1
        `,
        [row.sync_log_id]
      );
    }
  }

  return { processed: rows.length };
}
