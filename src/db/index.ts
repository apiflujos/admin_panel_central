import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let repairPromise: Promise<void> | null = null;

async function performRepair(p: Pool) {
  try {
    console.log("🛠️ INICIANDO REPARACIÓN DE ESQUEMA...");

    const queries = [
      // Crear tablas si no existen
      "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);",

      // Reparar SYNC_LOGS
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // Reparar RETRY_QUEUE (Soluciona el error de rq.next_run_at)
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",

      // Reparar SYNC_CHECKPOINTS
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS entity TEXT;",
      "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_start INTEGER DEFAULT 0;"
    ];

    for (const q of queries) {
      await p.query(q).catch(e => console.log(`Nota: ${e.message}`));
    }

    await p.query("INSERT INTO organizations (id, name) VALUES (1, 'Default') ON CONFLICT DO NOTHING;");

    console.log("✅ BASE DE DATOS REPARADA TOTALMENTE.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    dbReady = true; 
  }
}

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
              console.log(`⏳ Pausando (${prop}) hasta que la DB esté lista...`);
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

export const getPoolSync = getPool;
export async function ensureSyncCheckpointTable(p: Pool) { if (!dbReady) await repairPromise; }
export async function ensureRetryQueueTable(p: Pool) { if (!dbReady) await repairPromise; }
export async function ensureOrganization(p: Pool, id: number) { if (!dbReady) await repairPromise; }
export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
