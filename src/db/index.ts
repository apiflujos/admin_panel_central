import { AsyncLocalStorage } from "async_hooks";
import { Pool } from "pg";

let pool: Pool | null = null;
const schemaChecks = new Set<string>();

type OrgContext = { orgId: number };
const orgContext = new AsyncLocalStorage<OrgContext>();

export function runWithOrg<T>(orgId: number, fn: () => Promise<T>): Promise<T> {
  return orgContext.run({ orgId }, fn);
}

export function enterOrgContext(orgId: number) {
  if (!Number.isInteger(orgId) || orgId <= 0) return;
  orgContext.enterWith({ orgId });
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getSchemaErrorMessage(message: string) {
  return `${message}. Run migrations with "npm run db:migrate".`;
}

async function assertTable(poolInstance: Pool, table: string, schema = "public") {
  const key = `${schema}.${table}`;
  if (schemaChecks.has(key)) return;
  const result = await poolInstance.query<{ regclass: string | null }>("SELECT to_regclass($1) as regclass", [
    `${schema}.${table}`,
  ]);
  if (!result.rows[0]?.regclass) {
    throw new Error(getSchemaErrorMessage(`Missing table ${schema}.${table}`));
  }
  schemaChecks.add(key);
}

async function assertColumns(poolInstance: Pool, table: string, columns: string[], schema = "public") {
  const key = `${schema}.${table}:${columns.join(",")}`;
  if (schemaChecks.has(key)) return;
  await assertTable(poolInstance, table, schema);
  const result = await poolInstance.query<{ column_name: string }>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    `,
    [schema, table]
  );
  const existing = new Set(result.rows.map((row) => row.column_name));
  const missing = columns.filter((column) => !existing.has(column));
  if (missing.length) {
    throw new Error(getSchemaErrorMessage(`Missing columns in ${schema}.${table}: ${missing.join(", ")}`));
  }
  schemaChecks.add(key);
}

/**
 * Tamaño máximo del pool de conexiones a Postgres.
 *
 * Se expone para que quien hace fan-out de trabajo concurrente no pida más
 * paralelismo del que hay conexiones: cada tarea concurrente necesita su propia
 * conexión, y las que sobran se quedan esperando hasta agotar
 * `DB_POOL_CONNECTION_TIMEOUT_MS` y fallan con "timeout exceeded when trying to
 * connect". En producción, con `DB_POOL_MAX=3` y lotes de 5 ítems, eso generó
 * 2.273 timeouts en una semana y devolvió HTTP 500 a webhooks de Shopify.
 */
export function getPoolMax(): number {
  return parsePositiveInt(process.env.DB_POOL_MAX, 5);
}

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    const poolMax = getPoolMax();
    const idleTimeoutMillis = parsePositiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000);
    const connectionTimeoutMillis = parsePositiveInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 5000);
    const applicationName = String(process.env.DB_APP_NAME || "").trim() || undefined;
    pool = new Pool({
      connectionString,
      ssl,
      options: "-c search_path=public",
      max: poolMax,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      application_name: applicationName,
    });
    (pool as unknown as { on: (event: string, cb: (err: Error) => void) => void }).on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });
  }
  return pool;
}

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  await poolInstance.query(
    `
    INSERT INTO organizations (id, name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
    `,
    [orgId, `Org ${orgId}`]
  );
}

let invoiceTriggerColumnEnsured = false;
export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
  // Self-healing: crea invoice_trigger si falta, sin depender de correr las
  // migraciones en el deploy (el server no las corre al arrancar). Idempotente.
  if (!invoiceTriggerColumnEnsured) {
    try {
      await poolInstance.query(
        `ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS invoice_trigger TEXT DEFAULT 'on_create'`
      );
      invoiceTriggerColumnEnsured = true;
    } catch {
      // Si falla, assertColumns abajo lanzará el error claro de columna faltante.
    }
  }
  await assertColumns(poolInstance, "invoice_settings", [
    "organization_id",
    "generate_invoice",
    "resolution_id",
    "cost_center_id",
    "warehouse_id",
    "seller_id",
    "payment_method",
    "observations_template",
    "bank_account_id",
    "apply_payment",
    "einvoice_enabled",
    "invoice_trigger",
  ]);
}

export async function ensureInventoryRulesColumns(poolInstance: Pool) {
  await assertColumns(poolInstance, "inventory_rules", [
    "organization_id",
    "publish_on_stock",
    "min_stock",
    "warehouse_id",
    "warehouse_ids",
    "created_at",
    "auto_publish_on_webhook",
    "auto_publish_status",
    "inventory_adjustments_enabled",
    "inventory_adjustments_interval_minutes",
    "inventory_adjustments_autopublish",
    "only_active_items",
    "allow_oversell",
  ]);
}

export async function ensureUsersTables(poolInstance: Pool) {
  await assertColumns(poolInstance, "users", [
    "organization_id",
    "email",
    "password_hash",
    "role",
    "is_super_admin",
    "created_at",
  ]);
  await assertColumns(poolInstance, "user_sessions", ["user_id", "token", "expires_at", "created_at", "last_seen"]);
  await assertColumns(poolInstance, "company_profiles", ["organization_id", "name", "created_at"]);
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  await assertColumns(poolInstance, "sync_checkpoints", [
    "organization_id",
    "entity",
    "last_start",
    "total",
    "updated_at",
  ]);
}

export async function ensureWebhookEventsTable(poolInstance: Pool) {
  await assertColumns(poolInstance, "webhook_events", [
    "organization_id",
    "source",
    "event_type",
    "payload_json",
    "received_at",
    "processed_at",
    "status",
  ]);
}

export async function ensureSyncRunsTable(poolInstance: Pool) {
  await assertColumns(poolInstance, "sync_runs", [
    "organization_id",
    "sync_id",
    "sync_type",
    "status",
    "cancel_requested",
    "started_at",
    "finished_at",
    "meta_json",
  ]);
}

export async function ensureConnectionTestsTable(poolInstance: Pool) {
  await assertColumns(poolInstance, "connection_tests", [
    "organization_id",
    "provider",
    "status",
    "message",
    "checked_at",
  ]);
}

export function getOrgId() {
  const ctx = orgContext.getStore();
  if (ctx && Number.isInteger(ctx.orgId) && ctx.orgId > 0) {
    return ctx.orgId;
  }
  const raw = process.env.APP_ORG_ID || "1";
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("APP_ORG_ID must be a positive integer");
  }
  return parsed;
}
