import { Pool } from "pg";

let pool: Pool | null = null;
let poolProxy: Pool | null = null;
let dbReady = false;
let repairPromise: Promise<void> | null = null;
let ensureInvoiceSettingsPromise: Promise<void> | null = null;

async function performRepair(poolInstance: Pool) {
  if (!repairPromise) {
    repairPromise = (async () => {
      const queries = [
        "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
        "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
        "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
        "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT);",
        "CREATE TABLE IF NOT EXISTS credentials (id SERIAL PRIMARY KEY);",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_start INTEGER DEFAULT 0;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS provider TEXT;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS data_encrypted TEXT;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
      ];
      for (const query of queries) {
        try {
          await poolInstance.query(query);
        } catch {
          // best-effort repair; ignore if not applicable
        }
      }
      await poolInstance.query(
        "INSERT INTO organizations (id, name) VALUES (1, 'Default') ON CONFLICT DO NOTHING;"
      );
      dbReady = true;
    })().catch((error) => {
      dbReady = true;
      repairPromise = null;
      throw error;
    });
  }
  await repairPromise;
}

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    const ssl =
      process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    const rawPool = new Pool({ connectionString, ssl });
    void performRepair(rawPool);
    const handler: ProxyHandler<Pool> = {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop === "query" || prop === "connect") {
          return (...args: unknown[]) =>
            (repairPromise || Promise.resolve()).then(() =>
              (value as (...params: unknown[]) => unknown).apply(target, args)
            );
        }
        return value;
      },
    };
    pool = rawPool;
    poolProxy = new Proxy(rawPool, handler) as Pool;
  }
  return poolProxy || pool;
}

export async function ensureOrganization(poolInstance: Pool, orgId: number) {
  if (!dbReady && repairPromise) {
    await repairPromise;
  }
  await poolInstance.query(
    `
    INSERT INTO organizations (id, name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
    `,
    [orgId, `Org ${orgId}`]
  );
}

export async function ensureInvoiceSettingsColumns(poolInstance: Pool) {
  if (!dbReady && repairPromise) {
    await repairPromise;
  }
  if (!ensureInvoiceSettingsPromise) {
    ensureInvoiceSettingsPromise = poolInstance
      .query(
        `
        ALTER TABLE invoice_settings
          ADD COLUMN IF NOT EXISTS payment_method TEXT,
          ADD COLUMN IF NOT EXISTS observations_template TEXT,
          ADD COLUMN IF NOT EXISTS bank_account_id TEXT,
          ADD COLUMN IF NOT EXISTS apply_payment BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN NOT NULL DEFAULT false
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureInvoiceSettingsPromise = null;
        throw error;
      });
  }
  await ensureInvoiceSettingsPromise;
}

let ensureInventoryRulesPromise: Promise<void> | null = null;
let ensureSyncCheckpointPromise: Promise<void> | null = null;

export async function ensureInventoryRulesColumns(poolInstance: Pool) {
  if (!dbReady && repairPromise) {
    await repairPromise;
  }
  if (!ensureInventoryRulesPromise) {
    ensureInventoryRulesPromise = poolInstance
      .query(
        `
        ALTER TABLE inventory_rules
          ADD COLUMN IF NOT EXISTS auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'draft'
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureInventoryRulesPromise = null;
        throw error;
      });
  }
  await ensureInventoryRulesPromise;
}

export async function ensureSyncCheckpointTable(poolInstance: Pool) {
  if (!dbReady && repairPromise) {
    await repairPromise;
  }
  if (!ensureSyncCheckpointPromise) {
    ensureSyncCheckpointPromise = poolInstance
      .query(
        `
        CREATE TABLE IF NOT EXISTS sync_checkpoints (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          entity TEXT NOT NULL,
          last_start INTEGER NOT NULL DEFAULT 0,
          total INTEGER,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, entity)
        )
        `
      )
      .then(() => undefined)
      .catch((error) => {
        ensureSyncCheckpointPromise = null;
        throw error;
      });
  }
  await ensureSyncCheckpointPromise;
}

export function getOrgId() {
  const raw = process.env.APP_ORG_ID || "1";
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("APP_ORG_ID must be a positive integer");
  }
  return parsed;
}
