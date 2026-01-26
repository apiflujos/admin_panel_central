import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let initializationPromise: Promise<void> | null = null;

async function performRepair(p: Pool) {
  try {
    console.log("🛠️ AGREGANDO COLUMNAS FALTANTES (INCLUYENDO STATUS)...");
    
    const queries = [
      "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
      // Columnas para sync_logs
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;",
      // Columnas para retry_queue
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;", // La que pide el error ahora
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;"
    ];

    for (const q of queries) {
      await p.query(q);
    }

    console.log("✅ BASE DE DATOS REPARADA TOTALMENTE.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    dbReady = true;
  }
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    initializationPromise = performRepair(pool);

    const handler: ProxyHandler<Pool> = {
      get: (target: any, prop: string) => {
        const original = target[prop];
        if (typeof original === 'function' && (prop === 'query' || prop === 'connect')) {
          return async (...args: any[]) => {
            if (!dbReady) await initializationPromise;
            return original.apply(target, args);
          };
        }
        return original;
      }
    };
    pool = new Proxy(pool, handler) as Pool;
  }
  return pool;
}

export const getPoolSync = getPool;
export async function ensureOrganization() {}
export async function ensureRetryQueueTable() {}
export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
