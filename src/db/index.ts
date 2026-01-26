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

/**
 * REPARACIÓN FORZADA E INMEDIATA
 * Esta función se encarga de que las columnas existan sí o sí.
 */
async function forceQuickFix() {
  const p = getPool();
  try {
    // Reparar sync_logs
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS action TEXT;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS message TEXT;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS request_json JSONB;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS response_json JSONB;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS error_details TEXT;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;`);
    await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

    // Reparar retry_queue
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);
    await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;`);
    await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;`);
    await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;`);
    await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;`);
    await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    
    console.log("✅ Base de datos reparada con éxito.");
  } catch (err) {
    console.error("❌ Error en reparación rápida:", err);
  }
}

// Ejecutar reparación al cargar el módulo
forceQuickFix();

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  // Asegurar tabla organizations
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY, 
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insertar organización inicial
  await poolInstance.query(
    `INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [orgId, `Org ${orgId}`]
  );
}

export async function ensureRetryQueueTable(poolInstance: Pool) {
  await forceQuickFix();
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  const p = poolInstance;
  await p.query(`
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER,
      entity TEXT NOT NULL,
      last_start INTEGER DEFAULT 0,
      total INTEGER,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (organization_id, entity)
    );
  `);
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

export function getOrgId() {
  return Number(process.env.APP_ORG_ID || "1");
}
