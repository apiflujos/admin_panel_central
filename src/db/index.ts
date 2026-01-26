import { Pool } from "pg";

let pool: Pool | null = null;
let ensureInvoiceSettingsPromise: Promise<void> | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

// ESTA FUNCIÓN AHORA CREA LA TABLA SI NO EXISTE
export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await poolInstance.query(
    `
    INSERT INTO organizations (id, name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
    `,
    [orgId, `Org ${orgId}`]
  );
}

// TAMBIÉN AGREGAMOS ESTA PARA LA OTRA TABLA QUE DABA ERROR
export async function ensureRetryQueueTable(poolInstance: Pool) {
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS retry_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB,
      attempts INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
  if (!ensureInvoiceSettingsPromise) {
    ensureInvoiceSettingsPromise = poolInstance
      .query(
        `
        ALTER TABLE invoice_settings
          ADD COLUMN IF NOT EXISTS payment_method TEXT,
          ADD COLUMN IF NOT EXISTS observations_template TEXT,
          ADD COLUMN IF NOT EXISTS bank_account_id TEXT,
          ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN NOT NULL DEFAULT false
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureInvoiceSettingsPromise = null;
        throw error;
      });
  }
  await ensureInvoiceSettingsPromise;
}

let ensureInventoryRulesPromise: Promise<void> | null = null;
let ensureSyncCheckpointPromise: Promise<void> | null = null;

export async function ensureInventoryRulesColumns(poolInstance: Pool) {
  if (!ensureInventoryRulesPromise) {
    ensureInventoryRulesPromise = poolInstance
      .query(
        `
        ALTER TABLE inventory_rules
          ADD COLUMN IF NOT EXISTS auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'draft'
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureInventoryRulesPromise = null;
        throw error;
      });
  }
  await ensureInventoryRulesPromise;
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  if (!ensureSyncCheckpointPromise) {
    ensureSyncCheckpointPromise = poolInstance
      .query(
        `
        CREATE TABLE IF NOT EXISTS sync_checkpoints (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          entity TEXT NOT NULL,
          last_start INTEGER NOT NULL DEFAULT 0,
          total INTEGER,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, entity)
        )
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureSyncCheckpointPromise = null;
        throw error;
      });
  }
  await ensureSyncCheckpointPromise;
}

export function getOrgId() {
  const orgId = process.env.APP_ORG_ID;
  if (!orgId) {
    throw new Error("APP_ORG_ID is required");
  }
  const parsed = Number(orgId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("APP_ORG_ID must be a positive integer");
  }
  return parsed;
}
