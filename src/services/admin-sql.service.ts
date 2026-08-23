import { getPool } from "../db";

// Consola SQL para Super Admin. Ejecuta SQL contra la BD del cliente (hay UNA
// base por cliente, así que no hay riesgo cross-tenant). SOLO debe invocarse
// detrás de `requireSuperAdmin`. Registra cada ejecución (auditoría en logs) y
// acota el número de filas devueltas para no saturar la respuesta.
const MAX_ROWS = 1000;

export type AdminSqlResult = {
  command: string;
  rowCount: number;
  rows: Record<string, unknown>[];
  fields: string[];
  truncated: boolean;
  ms: number;
};

export async function executeAdminSql(
  sql: string,
  meta?: { userId?: number | null; email?: string | null }
): Promise<AdminSqlResult> {
  const trimmed = String(sql || "").trim();
  if (!trimmed) {
    throw new Error("SQL vacío.");
  }
  const pool = getPool();
  const started = Date.now();
  // Auditoría: quién ejecutó qué (los logs quedan en pm2). No registra resultados.
  console.log(`[SA-SQL] user=${meta?.email || meta?.userId || "?"} :: ${trimmed.replace(/\s+/g, " ").slice(0, 800)}`);
  const result = (await pool.query(trimmed)) as unknown as {
    command?: string;
    rowCount?: number | null;
    rows?: Record<string, unknown>[];
    fields?: Array<{ name: string }>;
  };
  const ms = Date.now() - started;
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const fields = Array.isArray(result.fields) ? result.fields.map((f) => f.name) : [];
  return {
    command: result.command || "",
    rowCount: typeof result.rowCount === "number" ? result.rowCount : rows.length,
    rows: rows.slice(0, MAX_ROWS),
    fields,
    truncated: rows.length > MAX_ROWS,
    ms,
  };
}
