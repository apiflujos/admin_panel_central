import { ensureConnectionTestsTable, getOrgId, getPool } from "../db";

export type ConnectionTestStatus = "ok" | "fail" | "skipped";

export type ConnectionTestRecord = {
  provider: string;
  status: ConnectionTestStatus;
  message?: string | null;
  request?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
};

export async function saveConnectionTest(record: ConnectionTestRecord) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureConnectionTestsTable(pool);
  const provider = String(record.provider || "").trim();
  if (!provider) {
    throw new Error("Proveedor requerido para guardar test de conexion.");
  }
  await pool.query(
    `
    INSERT INTO connection_tests
      (organization_id, provider, status, message, request_json, response_json, checked_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (organization_id, provider)
    DO UPDATE SET
      status = EXCLUDED.status,
      message = EXCLUDED.message,
      request_json = EXCLUDED.request_json,
      response_json = EXCLUDED.response_json,
      checked_at = NOW()
    `,
    [orgId, provider, record.status, record.message || null, record.request || null, record.response || null]
  );
}

export async function listConnectionTests() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureConnectionTestsTable(pool);
  const result = await pool.query<{
    provider: string;
    status: string;
    message: string | null;
    request_json: Record<string, unknown> | null;
    response_json: Record<string, unknown> | null;
    checked_at: string;
  }>(
    `
    SELECT provider, status, message, request_json, response_json, checked_at
    FROM connection_tests
    WHERE organization_id = $1
    ORDER BY provider ASC
    `,
    [orgId]
  );
  return result.rows.map((row) => ({
    provider: row.provider,
    status: row.status,
    message: row.message,
    request: row.request_json || null,
    response: row.response_json || null,
    checkedAt: row.checked_at,
  }));
}
