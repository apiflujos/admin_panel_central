import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let repairPromise: Promise<void> | null = null;

/**
 * REPARACIÓN INTEGRAL DE ESQUEMA
 */
async function performRepair(p: Pool) {
  try {
    console.log("🛠️ AGREGANDO VARIANTES DE COLUMNAS (next_run_at, status, etc)...");

    const queries = [
      "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);",

      // Reparar SYNC_LOGS
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // Reparar RETRY_QUEUE (Crucial para rq.next_run_at)
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // Reparar SYNC_CHECKPOINTS
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_start INTEGER DEFAULT 0;",
      "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sync_checkpoints_organization_id_entity_key') THEN ALTER TABLE sync_checkpoints ADD CONSTRAINT sync_checkpoints_organization_id_entity_key UNIQUE (organization_id, entity); END IF; END $$;"
    ];

    for (const q of queries) {
      await p.query(q);
    }

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
    const rawPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    repairPromise = performRepair(rawPool);

    const handler: ProxyHandler<Pool> = {
      get: (target: any, prop: string) => {
        const original = target[prop];
        if (typeof original === 'function' && (prop === 'query' || prop === 'connect')) {
          return async (...args: any[]) => {
            if (!dbReady) {
              console.log(`⏳ Pausando consulta (${prop}) hasta reparación...`);
              await repairPromise;
            }
            return original.apply(target, args);
          };
        }
        return original;
      }
    };
    pool = new Proxy(rawPool, handler) as Pool;
  }
  return pool;
}

// Exportaciones de compatibilidad
export const getPoolSync = getPool;
export async function ensureSyncCheckpointTable(p: Pool) { if (!dbReady) await repairPromise; }
export async function ensureRetryQueueTable(p: Pool) { if (!dbReady) await repairPromise; }
export async function ensureOrganization(p: Pool, id: number) { if (!dbReady) await repairPromise; }
export async function ensureInvoiceSettingsColumns(p: Pool) {
  if (!dbReady) await repairPromise;
  try {
    await p.query("ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT, ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;");
  } catch (e) {}
}
export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
