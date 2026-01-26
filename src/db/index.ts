import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let repairPromise: Promise<void> | null = null;

/**
 * REPARACIÓN TOTAL
 */
async function performRepair(p: Pool) {
  try {
    console.log("🛠️ AGREGANDO TODAS LAS COLUMNAS Y TABLAS FALTANTES...");
    
    const queries = [
      // 1. Tablas Base
      "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);",
      
      // 2. Reparar SYNC_LOGS
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS action TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS message TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS request_json JSONB;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS response_json JSONB;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS error_details TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // 3. Reparar RETRY_QUEUE
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // 4. Reparar SYNC_CHECKPOINTS
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_start INTEGER DEFAULT 0;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS total INTEGER;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();",
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sync_checkpoints_organization_id_entity_key') THEN ALTER TABLE sync_checkpoints ADD CONSTRAINT sync_checkpoints_organization_id_entity_key UNIQUE (organization_id, entity); END IF; END $$;"
    ];

    for (const q of queries) {
      await p.query(q);
    }

    // Asegurar Org por defecto
    await p.query("INSERT INTO organizations (id, name) VALUES (1, 'Default') ON CONFLICT DO NOTHING;");

    console.log("✅ BASE DE DATOS REPARADA TOTALMENTE.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    dbReady = true; 
  }
}

/**
 * GET POOL PROTEGIDO
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    repairPromise = performRepair(pool);

    pool = new Proxy(pool, {
      get: (target, prop) => {
        const val = (target as any)[prop];
        if (typeof val === 'function' && (prop === 'query' || prop === 'connect')) {
          return async (...args: any[]) => {
            if (!dbReady) await repairPromise;
            return val.apply(target, args);
          };
        }
        return val;
      }
    }) as Pool;
  }
  return pool;
}

// FUNCIONES QUE TU APP NECESITA PARA NO FALLAR
export const getPoolSync = getPool;

export async function ensureSyncCheckpointTable(p: Pool) {
  if (!dbReady) await repairPromise;
}

export async function ensureRetryQueueTable(p: Pool) {
  if (!dbReady) await repairPromise;
}

export async function ensureOrganization(p: Pool, id: number) {
  if (!dbReady) await repairPromise;
}

export async function ensureInvoiceSettingsColumns(p: Pool) {
  if (!dbReady) await repairPromise;
  try {
    await p.query(`
      ALTER TABLE invoice_settings 
      ADD COLUMN IF NOT EXISTS payment_method TEXT, 
      ADD COLUMN IF NOT EXISTS observations_template TEXT, 
      ADD COLUMN IF NOT EXISTS bank_account_id TEXT, 
      ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false, 
      ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;
    `);
  } catch (e) {}
}

export function getOrgId() {
  return Number(process.env.APP_ORG_ID || "1");
}
