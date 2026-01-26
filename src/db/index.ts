import { Pool } from "pg";

let pool: Pool | null = null;
let ensureInvoiceSettingsPromise: Promise<void> | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false } 
    });
  }
  return pool;
}

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  // 1. ORGANIZATIONS
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY, 
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. RETRY QUEUE - Asegurando estructura completa
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS retry_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB,
      attempts INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      sync_log_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Reparación de columnas retry_queue
  await poolInstance.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;`);

  // 3. SYNC LOGS - ¡ESTO SOLUCIONA TUS ERRORES ACTUALES!
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id),
      entity TEXT,
      action TEXT,
      status TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Inyectamos TODAS las columnas que el sistema podría pedir para evitar más reinicios
  const syncLogsFixes = [
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS request_json JSONB;`,
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS response_json JSONB;`,
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;`,
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS error_details TEXT;`,
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;`,
    `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;`
  ];

  for (const sql of syncLogsFixes) {
    try {
      await poolInstance.query(sql);
    } catch (e) {
      console.log("Columna ya existía o error ignorado");
    }
  }

  // 4. SYNC CHECKPOINTS
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id),
      entity TEXT NOT NULL,
      last_start INTEGER DEFAULT 0,
      total INTEGER,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (organization_id, entity)
    );
  `);

  // 5. Insertar organización por defecto
  await poolInstance.query(
    `INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [orgId, `Org ${orgId}`]
  );
}

export async function ensureRetryQueueTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, getOrgId());
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, getOrgId());
}

export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
  if (!ensureInvoiceSettingsPromise) {
    ensureInvoiceSettingsPromise = poolInstance
      .query(`
        ALTER TABLE invoice_settings
          ADD COLUMN IF NOT EXISTS payment_method TEXT,
          ADD COLUMN IF NOT EXISTS observations_template TEXT,
          ADD COLUMN IF NOT EXISTS bank_account_id TEXT,
          ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN NOT NULL DEFAULT false
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureInvoiceSettingsPromise = null;
        throw error;
      });
  }
  await ensureInvoiceSettingsPromise;
}

let ensureInventoryRulesPromise: Promise<void> | null = null;
export async function ensureInventoryRulesColumns(poolInstance: Pool) {
  if (!ensureInventoryRulesPromise) {
    ensureInventoryRulesPromise = poolInstance
      .query(`
        ALTER TABLE inventory_rules
          ADD COLUMN IF NOT EXISTS auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'draft'
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureInventoryRulesPromise = null;
        throw error;
      });
  }
  await ensureInventoryRulesPromise;
}

export function getOrgId() {
  const orgId = process.env.APP_ORG_ID || "1";
  return Number(orgId);
}
