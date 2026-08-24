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

export const orderLogKey = (orderId: string, shopDomain = "") => `${shopDomain}:${orderId}`;

export async function listLatestOrderLogs(orders: Array<string | { orderId: string; shopDomain?: string }>) {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();
  if (!orders.length) {
    return new Map<string, { status: string; message?: string | null }>();
  }
  const refs = orders.map((entry) =>
    typeof entry === "string" ? { orderId: entry, shopDomain: "" } : { ...entry, shopDomain: entry.shopDomain || "" }
  );
  const result = await pool.query<{
    order_id: string;
    shop_domain: string;
    status: string;
    message: string | null;
  }>(
    `
    SELECT DISTINCT ON (request_json->>'orderId', COALESCE(request_json->>'shopDomain', ''))
      request_json->>'orderId' AS order_id,
      COALESCE(request_json->>'shopDomain', '') AS shop_domain,
      status,
      message
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND request_json ? 'orderId'
      AND request_json->>'orderId' = ANY($2::text[])
    ORDER BY request_json->>'orderId', COALESCE(request_json->>'shopDomain', ''), created_at DESC
    `,
    [orgId, refs.map((entry) => entry.orderId)]
  );
  const map = new Map<string, { status: string; message?: string | null }>();
  const domainsPerOrder = new Map<string, Set<string>>();
  refs.forEach((entry) => {
    const domains = domainsPerOrder.get(entry.orderId) || new Set<string>();
    domains.add(entry.shopDomain);
    domainsPerOrder.set(entry.orderId, domains);
  });
  for (const row of result.rows) {
    const value = { status: row.status, message: row.message };
    if (row.shop_domain) {
      map.set(orderLogKey(row.order_id, row.shop_domain), value);
    } else if ((domainsPerOrder.get(row.order_id)?.size || 0) === 1) {
      const domain = Array.from(domainsPerOrder.get(row.order_id) || [""])[0] || "";
      map.set(orderLogKey(row.order_id, domain), value);
    }
    if (orders.every((entry) => typeof entry === "string")) map.set(row.order_id, value);
  }
  return map;
}

export async function getLatestInvoicePayload(
  orderId: string,
  shopDomain?: string
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
      AND ($3::text IS NULL OR request_json->>'shopDomain' = $3 OR NOT (request_json ? 'shopDomain'))
    ORDER BY (request_json->>'shopDomain' = $3) DESC, created_at DESC
    LIMIT 1
    `,
    [orgId, orderId, shopDomain || null]
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

/**
 * Registros de sincronización, con su cuenta REAL.
 *
 * Antes devolvía 200 filas fijas y el resumen se calculaba sobre esas 200, así
 * que la pantalla decía «Total · 200» habiendo 51.656, y «Fallidos · 12»
 * contando sólo dentro del trozo que le había tocado ver. Los contadores
 * mentían, que es peor que no tenerlos: se decide con ellos.
 */
export async function listSyncLogs(
  filters: LogFilters,
  paginacion?: { limit?: number; offset?: number }
): Promise<{
  items: SyncLogListItem[];
  filters: LogFilters;
  total: number;
  failedCount: number;
  retryingCount: number;
  limit: number;
  offset: number;
}> {
  const limit = Math.min(Math.max(Number(paginacion?.limit) || 50, 1), 200);
  const offset = Math.max(Number(paginacion?.offset) || 0, 0);
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
    conditions.push(`created_at <= $${idx}`);
    params.push(filters.to);
  }

  const donde = conditions.join(" AND ");

  // La cuenta se hace sobre TODO lo que cumple el filtro, no sobre la página.
  const cuentas = await pool.query<{ total: string; fallidos: string; reintentando: string }>(
    `
    SELECT count(*)::text AS total,
           count(*) FILTER (WHERE status = 'fail')::text AS fallidos,
           count(*) FILTER (WHERE status = 'retrying')::text AS reintentando
      FROM sync_logs
     WHERE ${donde}
    `,
    params
  );

  // Los marcadores se calculan desde `params.length`, NO desde el contador
  // `idx`: ese contador es inconsistente en los filtros de arriba —el último
  // usa `$idx` sin incrementarlo— y apoyarse en él daría un desfase silencioso.
  const posLimit = params.length + 1;
  const posOffset = params.length + 2;
  params.push(limit, offset);

  const query = `
    SELECT id, entity, direction, status, message, request_json, response_json, created_at
    FROM sync_logs
    WHERE ${donde}
    ORDER BY created_at DESC
    LIMIT $${posLimit} OFFSET $${posOffset}
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
        typeof row.request_json?.orderId === "string" || typeof row.request_json?.orderId === "number"
          ? String(row.request_json.orderId)
          : null,
      request_json: row.request_json || null,
      response_json: row.response_json || null,
    })
  );

  const fila = cuentas.rows[0];
  return {
    items,
    filters,
    total: Number(fila?.total || 0),
    failedCount: Number(fila?.fallidos || 0),
    retryingCount: Number(fila?.reintentando || 0),
    limit,
    offset,
  };
}

export async function retryFailedLogs() {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();

  const failed = await pool.query<{ id: number; eligible: boolean }>(
    `
    SELECT id,
           (
             request_json ? 'webhookEvent'
             OR (
               entity = 'order'
               AND NULLIF(request_json->>'orderId', '') IS NOT NULL
               AND request_json ? 'invoicePayload'
             )
           ) AS eligible
    FROM sync_logs
    WHERE organization_id = $1 AND status = 'fail'
    `,
    [orgId]
  );

  if (!failed.rows.length) {
    return { retried: 0 };
  }

  // No todo fallo es reintentable. Configuración incompleta, validaciones de
  // negocio y acciones administrativas no deben convertirse en trabajo ciego.
  const ids = failed.rows.filter((row) => row.eligible).map((row) => row.id);
  const ignored = failed.rows.length - ids.length;
  if (!ids.length) {
    return { retried: 0, ignored };
  }

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
    return { retried: 0, ignored };
  }

  await pool.query(
    `
    UPDATE sync_logs
    SET status = 'retrying', retry_count = retry_count + 1
    WHERE id = ANY($1::int[])
    `,
    [insertedIds]
  );

  return { retried: insertedIds.length, ignored };
}

export async function createSyncLog(payload: {
  entity: string;
  direction: string;
  status: "success" | "fail" | "retrying" | "warn" | "queued";
  message?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}) {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();

  const result = await pool.query<{ id: number }>(
    `
    INSERT INTO sync_logs
      (organization_id, entity, direction, status, message, request_json, response_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
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
  return result.rows[0]?.id || null;
}

export async function updateSyncLog(
  id: number,
  payload: {
    status?: "success" | "fail" | "retrying" | "warn" | "queued";
    message?: string | null;
    request?: Record<string, unknown> | null;
    response?: Record<string, unknown> | null;
  }
) {
  const { getOrgId, getPool } = await import("../db");
  const pool = getPool();
  const orgId = getOrgId();
  await pool.query(
    `
    UPDATE sync_logs
    SET status = COALESCE($3, status),
        message = COALESCE($4, message),
        request_json = COALESCE($5, request_json),
        response_json = COALESCE($6, response_json)
    WHERE organization_id = $1 AND id = $2
    `,
    [orgId, id, payload.status || null, payload.message ?? null, payload.request ?? null, payload.response ?? null]
  );
}
