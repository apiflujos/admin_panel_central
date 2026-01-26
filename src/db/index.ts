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

  // 2. RETRY QUEUE
  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS retry_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB,
      attempts INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. SYNC LOGS (La que te falló ahora)
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

// Funciones adicionales de soporte
export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, getOrgId()); 
}

export async function ensureRetryQueueTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, getOrgId());
}

export function getOrgId() {
  const orgId = process.env.APP_ORG_ID || "1";
  return Number(orgId);
}
