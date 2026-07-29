import { getPool, runWithOrg } from "../db";
import { retryInvoiceFromLog } from "./operations.service";
import { processQueuedWebhookEvent, type WebhookEvent, type WebhookSource } from "./sync.service";
import { updateSyncLog } from "./logs.service";

type RetryRow = {
  id: number;
  organization_id: number;
  sync_log_id: number;
  entity: string;
  request_json: Record<string, unknown> | null;
  retry_count: number;
};

type JsonObject = Record<string, unknown>;

type QueuedWebhookEvent = WebhookEvent & {
  webhookEventId: number | null;
  meta: JsonObject;
};

function asRecord(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function parseWebhookSource(value: unknown): WebhookSource | null {
  return value === "shopify" || value === "alegra" ? value : null;
}

function parseQueuedWebhookEvent(value: unknown): QueuedWebhookEvent | null {
  const record = asRecord(value);
  if (!record) return null;
  const source = parseWebhookSource(record.source);
  const eventType = typeof record.eventType === "string" ? record.eventType : null;
  if (!source || !eventType) return null;
  const meta = asRecord(record.meta) || {};
  const webhookEventIdRaw = record.webhookEventId;
  const webhookEventId =
    typeof webhookEventIdRaw === "number" && Number.isFinite(webhookEventIdRaw)
      ? webhookEventIdRaw
      : typeof webhookEventIdRaw === "string" && webhookEventIdRaw.trim() && Number.isFinite(Number(webhookEventIdRaw))
        ? Number(webhookEventIdRaw)
        : null;
  return {
    source,
    eventType,
    payload: record.payload,
    meta,
    webhookEventId,
  };
}

export async function processRetryQueue(limit = 50) {
  const pool = getPool();

  // Reaper: rows en `processing` >15 min → vuelven a `pending` para no perderse ante crash del worker.
  await pool
    .query(
      `
      UPDATE retry_queue
      SET status = 'pending'
      WHERE status = 'processing'
        AND next_run_at < NOW() - INTERVAL '15 minutes'
      `
    )
    .catch(() => undefined);

  const client = await pool.connect();
  let rows: RetryRow[];
  try {
    await client.query("BEGIN");
    // Sin filtro fijo de org — el `organization_id` viene con cada row y se aplica en `runWithOrg`.
    const result = await client.query<RetryRow>(
      `
      SELECT rq.id, sl.organization_id, rq.sync_log_id, sl.entity, sl.request_json, sl.retry_count
      FROM retry_queue rq
      JOIN sync_logs sl ON sl.id = rq.sync_log_id
      WHERE rq.status = 'pending'
        AND rq.next_run_at <= NOW()
      ORDER BY rq.next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
      `,
      [limit]
    );
    rows = result.rows;
    if (rows.length) {
      await client.query(`UPDATE retry_queue SET status = 'processing' WHERE id = ANY($1::int[])`, [
        rows.map((row) => row.id),
      ]);
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
    const rowOrgId = Number(row.organization_id);

    const attempt = async () => {
      // Preferir SIEMPRE el payload del webhook cuando existe: trae el pedido
      // completo + __shopDomain, así que se procesa directo. Es lo correcto para
      // orders/create de pedidos NUEVOS que aún no están en la tabla `orders`
      // (retryInvoiceFromLog resolvía el dominio desde `orders` y, al no existir
      // la fila, caía a buildSyncContext() sin dominio -> "Missing Shopify
      // credentials in DB" y reintentos infinitos).
      const queuedEvent = parseQueuedWebhookEvent(row.request_json?.webhookEvent);
      if (queuedEvent) {
        await processQueuedWebhookEvent({
          syncLogId: row.sync_log_id,
          event: {
            source: queuedEvent.source,
            eventType: queuedEvent.eventType,
            payload: queuedEvent.payload,
            meta: queuedEvent.meta,
          },
          webhookEventId: queuedEvent.webhookEventId,
        });
      } else if (row.entity === "order" && (typeof orderId === "string" || typeof orderId === "number")) {
        // Retry manual sin payload de webhook: reintenta desde el pedido guardado.
        await retryInvoiceFromLog(String(orderId));
      } else {
        await pool.query(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [row.id]);
        return "skipped" as const;
      }
      await pool.query(`UPDATE retry_queue SET status = 'done' WHERE id = $1`, [row.id]);
      return "done" as const;
    };

    try {
      if (Number.isInteger(rowOrgId) && rowOrgId > 0) {
        await runWithOrg(rowOrgId, attempt);
      } else {
        // Row sin org — solo puede ocurrir por data corruption. Salta.
        console.error(`[retry-queue] row ${row.id} sin organization_id — skipped`);
        await pool.query(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [row.id]);
        continue;
      }
    } catch (error) {
      console.error(`[retry-queue] orderId=${orderId} attempt failed:`, error instanceof Error ? error.message : error);
      const nextRetryCount = row.retry_count + 1;
      if (nextRetryCount >= maxRetries) {
        await pool.query(`UPDATE retry_queue SET status = 'failed' WHERE id = $1`, [row.id]);
        await updateSyncLog(row.sync_log_id, {
          status: "fail",
          message: error instanceof Error ? error.message : "Retry failed",
        });
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
      await updateSyncLog(row.sync_log_id, {
        status: "retrying",
        message: error instanceof Error ? error.message : "Retry scheduled",
      });
    }
  }

  return { processed: rows.length };
}
