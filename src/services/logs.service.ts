type LogFilters = {
  status?: string;
  orderId?: string;
  entity?: string;
  direction?: string;
  from?: string;
  to?: string;
};

export type SyncLogListItem = {
  id: number;
  entity: string;
  direction: string;
  status: string;
  message: string | null;
  created_at: string;
  order_id: string | null;
  request_json: Record<string, unknown> | null;
  response_json: Record<string, unknown> | null;
};

export async function listLatestOrderLogs(orderIds: string[]) {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();
  if (!orderIds.length) {
    return new Map<string, { status: string; message?: string | null }>();
  }
  const result = await pool.query<{
    order_id: string;
    status: string;
    message: string | null;
  }>(
    `
    SELECT DISTINCT ON (request_json->>'orderId')
      request_json->>'orderId' AS order_id,
      status,
      message
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND request_json ? 'orderId'
      AND request_json->>'orderId' = ANY($2::text[])
    ORDER BY request_json->>'orderId', created_at DESC
    `,
    [orgId, orderIds]
  );
  const map = new Map<string, { status: string; message?: string | null }>();
  for (const row of result.rows) {
    map.set(row.order_id, { status: row.status, message: row.message });
  }
  return map;
}

export async function getLatestInvoicePayload(
  orderId: string
): Promise<Record<string, unknown> | null> {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{
    request_json: Record<string, unknown> | null;
  }>(
    `
    SELECT request_json
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND request_json->>'orderId' = $2
      AND request_json ? 'invoicePayload'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, orderId]
  );
  if (!result.rows.length) {
    return null;
  }
  const request = result.rows[0].request_json || {};
  const payload = request.invoicePayload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

export async function listSyncLogs(
  filters: LogFilters
): Promise<{ items: SyncLogListItem[]; filters: LogFilters }> {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();

  const conditions: string[] = ["organization_id = $1"];
  const params: Array<string | number> = [orgId];
  let idx = 2;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.orderId) {
    conditions.push(`request_json->>'orderId' = $${idx++}`);
    params.push(filters.orderId);
  }
  if (filters.entity) {
    conditions.push(`entity = $${idx++}`);
    params.push(filters.entity);
  }
  if (filters.direction) {
    conditions.push(`direction = $${idx++}`);
    params.push(filters.direction);
  }
  if (filters.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.to);
  }

  const query = `
    SELECT id, entity, direction, status, message, request_json, response_json, created_at
    FROM sync_logs
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  const result = await pool.query<{
    id: number;
    entity: string;
    direction: string;
    status: string;
    message: string | null;
    request_json: Record<string, unknown> | null;
    response_json: Record<string, unknown> | null;
    created_at: string;
  }>(query, params);
  const items: SyncLogListItem[] = result.rows.map(
    (row: {
      id: number;
      entity: string;
      direction: string;
      status: string;
      message: string | null;
      request_json: Record<string, unknown> | null;
      response_json: Record<string, unknown> | null;
      created_at: string;
    }) => ({
    id: row.id,
    entity: row.entity,
    direction: row.direction,
    status: row.status,
    message: row.message,
    created_at: row.created_at,
    order_id:
      typeof row.request_json?.orderId === "string" ||
      typeof row.request_json?.orderId === "number"
        ? String(row.request_json.orderId)
        : null,
    request_json: row.request_json || null,
    response_json: row.response_json || null,
    })
  );

  return { items, filters };
}

export async function retryFailedLogs() {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();

  const failed = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM sync_logs
    WHERE organization_id = $1 AND status = 'fail'
    `,
    [orgId]
  );

  if (!failed.rows.length) {
    return { retried: 0 };
  }

  const ids = failed.rows.map((row: { id: number }) => row.id);

  const inserted = await pool.query<{ sync_log_id: number }>(
    `
    INSERT INTO retry_queue (sync_log_id, next_run_at)
    SELECT id, NOW()
    FROM sync_logs
    WHERE id = ANY($1::int[])
      AND NOT EXISTS (
        SELECT 1 FROM retry_queue WHERE sync_log_id = sync_logs.id
      )
    RETURNING sync_log_id
    `,
    [ids]
  );

  const insertedIds = inserted.rows.map((row: { sync_log_id: number }) => row.sync_log_id);
  if (!insertedIds.length) {
    return { retried: 0 };
  }

  await pool.query(
    `
    UPDATE sync_logs
    SET status = 'retrying', retry_count = retry_count + 1
    WHERE id = ANY($1::int[])
    `,
    [insertedIds]
  );

  return { retried: insertedIds.length };
}

export async function createSyncLog(payload: {
  entity: string;
  direction: string;
  status: "success" | "fail" | "retrying";
  message?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}) {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();

  await pool.query(
    `
    INSERT INTO sync_logs
      (organization_id, entity, direction, status, message, request_json, response_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      orgId,
      payload.entity,
      payload.direction,
      payload.status,
      payload.message || null,
      payload.request || null,
      payload.response || null,
    ]
  );
}
