import { Pool } from "pg";

let pool: Pool | null = null;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Retorna el pool de conexión, asegurando que la DB esté reparada antes de usarla
 */
export async function getPool() {
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

  // Si no se ha inicializado, esperamos a que termine la reparación
  if (!isInitialized) {
    if (!initializationPromise) {
      initializationPromise = forceQuickFix(pool);
    }
    await initializationPromise;
  }

  return pool;
}

/**
 * REPARACIÓN CRÍTICA: Bloquea el acceso hasta terminar
 */
async function forceQuickFix(p: Pool) {
  try {
    console.log("🛠️ Iniciando reparación de emergencia de la base de datos...");
    
    // Reparar SYNC_LOGS
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    const syncLogsCols = [
      `organization_id INTEGER`, `entity TEXT`, `action TEXT`, `status TEXT`, 
      `message TEXT`, `request_json JSONB`, `response_json JSONB`, 
      `retry_count INTEGER DEFAULT 0`, `error_details TEXT`, 
      `last_attempt TIMESTAMP`, `created_at TIMESTAMP DEFAULT NOW()`
    ];
    for (const col of syncLogsCols) {
      await p.query(`ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Reparar RETRY_QUEUE
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);
    const retryCols = [
      `sync_log_id INTEGER`, `payload JSONB`, `attempts INTEGER DEFAULT 0`, 
      `next_retry TIMESTAMP`, `created_at TIMESTAMP DEFAULT NOW()`
    ];
    for (const col of retryCols) {
      await p.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Reparar ORGANIZATIONS
    await p.query(`CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);`);
    await p.query(`INSERT INTO organizations (id, name) VALUES (1, 'Org 1') ON CONFLICT DO NOTHING;`);

    isInitialized = true;
    console.log("✅ Base de datos reparada y lista para consultas.");
  } catch (err) {
    console.error("❌ Error crítico en reparación:", err);
    // No marcamos como inicializado para que el siguiente intento lo repita
    initializationPromise = null; 
    throw err;
  }
}

// Exportamos una versión síncrona para compatibilidad, pero la función de arriba es la clave
export function getPoolSync() {
  if (!pool) {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } 
    });
  }
  return pool;
}

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  await getPool(); // Esto dispara la reparación
}

export async function ensureRetryQueueTable(poolInstance: Pool) {
  await getPool();
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
  const p = poolInstance;
  await p.query(`
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
