import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;
let repairPromise: Promise<void> | null = null;

/**
 * REPARACIÓN PRIORITARIA
 * Ejecuta los cambios de esquema antes de liberar las consultas.
 */
async function performRepair(p: Pool) {
  try {
    console.log("🛠️ EJECUTANDO REPARACIÓN DE COLUMNAS EN SEGUNDO PLANO...");
    
    // 1. Asegurar tablas base
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);

    // 2. Inyectar columnas faltantes una por una
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

    console.log("✅ BASE DE DATOS REPARADA Y LISTA.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    dbReady = true; // Liberamos para evitar un bloqueo infinito si algo sale mal
  }
}

/**
 * LA SOLUCIÓN: getPool con Proxy
 * Devuelve el pool pero intercepta las consultas si la DB no está lista.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");

    const rawPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    repairPromise = performRepair(rawPool);

    // El Proxy intercepta las llamadas a .query y .connect
    pool = new Proxy(rawPool, {
      get: (target, prop) => {
        const val = (target as any)[prop];
        if (typeof val === 'function' && (prop === 'query' || prop === 'connect')) {
          return async (...args: any[]) => {
            if (!dbReady) {
              console.log(`⏳ Consulta pausada: Esperando reparación de columnas (${prop})...`);
              await repairPromise;
            }
            return val.apply(target, args);
          };
        }
        return val;
      }
    }) as Pool;
  }
  return pool;
}

export const getPoolSync = getPool;

// Funciones de compatibilidad para el resto de la app
export async function ensureOrganization() {}
export async function ensureRetryQueueTable() {}
export async function ensureSyncCheckpointTable(p: Pool) {
  if (!dbReady) await repairPromise;
  await p.query(`CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY, organization_id INTEGER, entity TEXT, last_start INTEGER DEFAULT 0, total INTEGER, updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(organization_id, entity));`);
}

export async function ensureInvoiceSettingsColumns(p: Pool) {
  if (!dbReady) await repairPromise;
  try {
    await p.query(`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT, ADD COLUMN IF NOT EXISTS observations_template TEXT, ADD COLUMN IF NOT EXISTS bank_account_id TEXT, ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;`);
  } catch (e) {}
}

export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
