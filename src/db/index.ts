import { Pool } from "pg";

let pool: Pool | null = null;
const schemaChecks = new Set<string>();

function getSchemaErrorMessage(message: string) {
  return `${message}. Run migrations with \"npm run db:migrate\".`;
}

async function assertTable(poolInstance: Pool, table: string, schema = "public") {
  const key = `${schema}.${table}`;
  if (schemaChecks.has(key)) return;
  const result = await poolInstance.query<{ regclass: string | null }>(
    "SELECT to_regclass($1) as regclass",
    [`${schema}.${table}`]
  );
  if (!result.rows[0]?.regclass) {
    throw new Error(getSchemaErrorMessage(`Missing table ${schema}.${table}`));
  }
  schemaChecks.add(key);
}

async function assertColumns(
  poolInstance: Pool,
  table: string,
  columns: string[],
  schema = "public"
) {
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
    throw new Error(
      getSchemaErrorMessage(
        `Missing columns in ${schema}.${table}: ${missing.join(", ")}`
      )
    );
  }
  schemaChecks.add(key);
}

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    const ssl =
      process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    pool = new Pool({
      connectionString,
      ssl,
      options: "-c search_path=public",
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

export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
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
  await assertColumns(poolInstance, "user_sessions", [
    "user_id",
    "token",
    "expires_at",
    "created_at",
    "last_seen",
  ]);
  await assertColumns(poolInstance, "company_profiles", [
    "organization_id",
    "name",
    "created_at",
  ]);
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

export function getOrgId() {
  const raw = process.env.APP_ORG_ID || "1";
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("APP_ORG_ID must be a positive integer");
  }
  return parsed;
}
