import { Pool } from "pg";

let pool: Pool | null = null;
let isRepairing = false;
let isFinished = false;

/**
 * REPARACIÓN SÍNCRONA DE RAÍZ
 */
async function runCriticalRepair(p: Pool) {
  if (isRepairing || isFinished) return;
  isRepairing = true;
  
  try {
    console.log("🛠️ EJECUTANDO REPARACIÓN CRÍTICA DE COLUMNAS...");
    
    // 1. Asegurar tablas base
    await p.query(`CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);`);
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);

    // 2. Inyectar columnas faltantes (AQUÍ ES DONDE FALLABA)
    const queries = [
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

    for (const q of queries) {
      await p.query(q);
    }

    await p.query(`INSERT INTO organizations (id, name) VALUES (1, 'Default') ON CONFLICT DO NOTHING;`);
    
    isFinished = true;
    console.log("✅ BASE DE DATOS REPARADA - PROCESO LIBERADO");
  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN REPARACIÓN:", err);
  } finally {
    isRepairing = false;
  }
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    
    pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false } 
    });

    // Disparamos la reparación inmediatamente
    runCriticalRepair(pool);
  }
  return pool;
}

export const getPoolSync = getPool;

// Funciones de compatibilidad para evitar errores en otros archivos
export async function ensureOrganization(p: Pool, id: number) { await runCriticalRepair(p); }
export async function ensureRetryQueueTable(p: Pool) { await runCriticalRepair(p); }
export async function ensureSyncCheckpointTable(p: Pool) {
  await p.query(`CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY, organization_id INTEGER, entity TEXT, last_start INTEGER DEFAULT 0, total INTEGER, updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(organization_id, entity));`);
}

export async function ensureInvoiceSettingsColumns(p: Pool) {
  try {
    await p.query(`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT, ADD COLUMN IF NOT EXISTS observations_template TEXT, ADD COLUMN IF NOT EXISTS bank_account_id TEXT, ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;`);
  } catch (e) {}
}

export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
