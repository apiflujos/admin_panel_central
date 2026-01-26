import { Pool } from "pg";

let pool: Pool | null = null;
let isInitialized = false;

/**
 * REPARACIÓN DE RAÍZ:
 * Crea las tablas y columnas necesarias sin bloquear el inicio del servidor.
 */
async function runSilentRepair(p: Pool) {
  if (isInitialized) return;
  
  try {
    console.log("🛠️ Iniciando reparación de base de datos en segundo plano...");
    
    // 1. Asegurar SYNC_LOGS y sus columnas
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    const syncLogsCols = [
      "organization_id INTEGER", "entity TEXT", "action TEXT", "status TEXT",
      "message TEXT", "request_json JSONB", "response_json JSONB",
      "retry_count INTEGER DEFAULT 0", "error_details TEXT",
      "last_attempt TIMESTAMP", "created_at TIMESTAMP DEFAULT NOW()"
    ];
    for (const col of syncLogsCols) {
      await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // 2. Asegurar RETRY_QUEUE y sus columnas
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);
    const retryCols = [
      "sync_log_id INTEGER", "payload JSONB", "attempts INTEGER DEFAULT 0",
      "next_retry TIMESTAMP", "created_at TIMESTAMP DEFAULT NOW()"
    ];
    for (const col of retryCols) {
      await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // 3. Asegurar ORGANIZATIONS
    await p.query(`CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);`);
    await p.query(`INSERT INTO organizations (id, name) VALUES (1, 'Default Org') ON CONFLICT DO NOTHING;`);

    isInitialized = true;
    console.log("✅ Base de datos verificada y lista.");
  } catch (err) {
    console.error("⚠️ Aviso: La reparación automática encontró un problema (esto es normal si las tablas ya existen):", err);
  }
}

/**
 * RETORNA EL POOL DE CONEXIÓN
 * Devuelve el objeto Pool directamente para evitar el error "TypeError".
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false } 
    });
    
    // Ejecutamos la reparación sin el 'await' para no bloquear el objeto pool
    runSilentRepair(pool);
  }
  return pool;
}

// Alias para compatibilidad con otros archivos
export const getPoolSync = getPool;

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  if (!isInitialized) await runSilentRepair(poolInstance);
}

export async function ensureRetryQueueTable(poolInstance: Pool) {
  if (!isInitialized) await runSilentRepair(poolInstance);
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  await poolInstance.query(`
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
  await poolInstance.query(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice_settings') THEN
        ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT;
        ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS observations_template TEXT;
        ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS bank_account_id TEXT;
        ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false;
        ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;
      END IF;
    END $$;
  `);
}

export function getOrgId() {
  return Number(process.env.APP_ORG_ID || "1");
}
