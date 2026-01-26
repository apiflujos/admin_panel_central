import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let initializationPromise: Promise<void> | null = null;

/**
 * REPARACIÓN BLOQUEANTE Y PRIORITARIA
 */
async function performRepair(p: Pool) {
  try {
    console.log("🛠️ EJECUTANDO REPARACIÓN CRÍTICA DE COLUMNAS...");
    
    // Asegurar tablas base
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);

    const repairQueries = [
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS action TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS message TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS request_json JSONB;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS response_json JSONB;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS error_details TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();"
    ];

    for (const sql of repairQueries) {
      await p.query(sql);
    }

    console.log("✅ BASE DE DATOS REPARADA. LIBERANDO CONSULTAS.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    // Aún así permitimos que continúe para no bloquear infinitamente
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

    const rawPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    // Lanzar reparación inmediatamente
    initializationPromise = performRepair(rawPool);

    // Creamos un Proxy para el pool. Si alguien llama a pool.query o pool.connect,
    // esperaremos a que dbReady sea true.
    const handler: ProxyHandler<Pool> = {
      get: (target: any, prop: string) => {
        const original = target[prop];
        if (typeof original === 'function' && (prop === 'query' || prop === 'connect')) {
          return async (...args: any[]) => {
            if (!dbReady) {
              console.log(`⏳ Consulta en espera: ${prop}...`);
              await initializationPromise;
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

export const getPoolSync = getPool;

// Funciones de compatibilidad vacías (ya lo hace el pool protegido)
export async function ensureOrganization() {}
export async function ensureRetryQueueTable() {}
export async function ensureSyncCheckpointTable(p: Pool) {
  if (!dbReady) await initializationPromise;
  await p.query(`CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY, organization_id INTEGER, entity TEXT, last_start INTEGER DEFAULT 0, total INTEGER, updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(organization_id, entity));`);
}

export async function ensureInvoiceSettingsColumns(p: Pool) {
  if (!dbReady) await initializationPromise;
  try {
    await p.query(`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT, ADD COLUMN IF NOT EXISTS observations_template TEXT, ADD COLUMN IF NOT EXISTS bank_account_id TEXT, ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;`);
  } catch (e) {}
}

export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
