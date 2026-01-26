import { Pool } from "pg";

let pool: Pool | null = null;
let initializationPromise: Promise<Pool> | null = null;

/**
 * REPARACIÓN BLOQUEANTE:
 * Crea las tablas y columnas. No devuelve el control hasta terminar.
 */
async function initializeAndRepair(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const p = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("🛠️ INICIANDO REPARACIÓN BLOQUEANTE DE BASE DE DATOS...");
    
    // Crear tablas base primero
    await p.query(`CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);`);
    await p.query(`CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);`);
    await p.query(`CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);`);

    // Lista de columnas críticas que faltan
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
    
    console.log("✅ BASE DE DATOS REPARADA Y LISTA.");
    pool = p;
    return p;
  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN INICIALIZACIÓN:", err);
    throw err;
  }
}

/**
 * getPool ahora devuelve el pool solo cuando es seguro usarlo.
 */
export function getPool(): Pool {
  if (!pool) {
    // Si alguien pide el pool y no está listo, lanzamos el error o inicializamos.
    // Pero para evitar el TypeError anterior, devolvemos una instancia aunque sea temporal
    // o forzamos la inicialización previa.
    throw new Error("Base de datos no inicializada. Use getPoolAsync()");
  }
  return pool;
}

/**
 * Versión asíncrona que espera la reparación.
 */
export async function getPoolAsync(): Promise<Pool> {
  if (!initializationPromise) {
    initializationPromise = initializeAndRepair();
  }
  return initializationPromise;
}

// Alias para compatibilidad (intentará devolver el pool si ya existe)
export const getPoolSync = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    initializeAndRepair(); // Lo hace en background pero al menos existe el objeto
  }
  return pool;
};

// Exportar funciones vacías o de espera para que el resto del código no falle
export async function ensureOrganization() {}
export async function ensureRetryQueueTable() {}
export async function ensureSyncCheckpointTable(p: Pool) {
  await p.query(`CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY, organization_id INTEGER, entity TEXT, last_start INTEGER DEFAULT 0, total INTEGER, updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(organization_id, entity));`);
}

export async function ensureInvoiceSettingsColumns(p: Pool) {
  try {
    await p.query(`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT, ADD COLUMN IF NOT EXISTS observations_template TEXT, ADD COLUMN IF NOT EXISTS bank_account_id TEXT, ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN DEFAULT false;`);
  } catch (e) {}
}

export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }

// AUTO-INICIALIZACIÓN AL IMPORTAR
getPoolAsync();
