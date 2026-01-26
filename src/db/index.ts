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
  // Array de todas las tablas necesarias
  const tableQueries = [
    `CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY, 
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS retry_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB,
      attempts INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER,
      entity TEXT,
      action TEXT,
      status TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS sync_checkpoints (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      entity TEXT NOT NULL,
      last_start INTEGER NOT NULL DEFAULT 0,
      total INTEGER,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (organization_id, entity)
    );`
  ];

  // Ejecutar cada creación una por una
  for (const query of tableQueries) {
    await poolInstance.query(query);
  }

  // Insertar la organización por defecto
  await poolInstance.query(
    `INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [orgId, `Org ${orgId}`]
  );
}

// Estas funciones ahora solo llaman a la principal para asegurar que todo esté creado
export async function ensureRetryQueueTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, 1);
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  await ensureOrganization(poolInstance, 1);
}

export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
  // Lógica simple para evitar errores si la tabla aún no existe en otros servicios
  try {
    await poolInstance.query(`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_method TEXT;`);
  } catch (e) {
    console.log("Invoice settings table not ready yet, skipping columns...");
  }
}

export function getOrgId() {
  return Number(process.env.APP_ORG_ID || "1");
}
