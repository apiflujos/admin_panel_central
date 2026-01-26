import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
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
  return pool;
}

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  // 1. ORGANIZATIONS
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY, 
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. RETRY QUEUE (CON LA COLUMNA sync_log_id QUE FALTA)
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS retry_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB,
      attempts INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      sync_log_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Intentar agregar la columna por si la tabla ya existía sin ella
  try {
    await poolInstance.query(`ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;`);
  } catch (e) {
    console.log("Columna sync_log_id ya presente o error menor.");
  }

  // 3. SYNC LOGS
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id),
      entity TEXT,
      action TEXT,
      status TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. SYNC CHECKPOINTS
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id),
      entity TEXT NOT NULL,
      last_start INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (organization_id, entity)
    );
  `);

  // Insertar organización inicial
  await poolInstance.query(
    `INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [orgId, `Org ${orgId}`]
  );
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) { await ensureOrganization(poolInstance, 1); }
export async function ensureRetryQueueTable(poolInstance: Pool) { await ensureOrganization(poolInstance, 1); }

export function getOrgId() { return Number(process.env.APP_ORG_ID || "1"); }
