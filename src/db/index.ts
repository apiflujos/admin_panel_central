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
        "CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'UTC', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS credentials (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), provider TEXT NOT NULL, data_encrypted TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS shopify_stores (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL, access_token_encrypted TEXT NOT NULL, scopes TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS alegra_accounts (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), user_email TEXT NOT NULL, api_key_encrypted TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS sync_mappings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), entity TEXT NOT NULL, shopify_id TEXT, alegra_id TEXT, parent_id TEXT, metadata_json JSONB NOT NULL DEFAULT '{}');",
        "CREATE TABLE IF NOT EXISTS inventory_rules (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE, min_stock INTEGER NOT NULL DEFAULT 0, warehouse_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS tax_rules (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shopify_tax_id TEXT NOT NULL, alegra_tax_id TEXT NOT NULL, type TEXT NOT NULL);",
        "CREATE TABLE IF NOT EXISTS invoice_settings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), generate_invoice BOOLEAN NOT NULL DEFAULT FALSE, resolution_id TEXT, cost_center_id TEXT, warehouse_id TEXT, seller_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS webhook_events (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), source TEXT NOT NULL, event_type TEXT NOT NULL, payload_json JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'pending');",
        "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), entity TEXT NOT NULL, direction TEXT NOT NULL, status TEXT NOT NULL, message TEXT, request_json JSONB, response_json JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), retry_count INTEGER NOT NULL DEFAULT 0);",
        "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY, sync_log_id INTEGER NOT NULL REFERENCES sync_logs(id), next_run_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'pending');",
        "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
        "CREATE TABLE IF NOT EXISTS payment_mappings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), method_id TEXT NOT NULL, account_id TEXT NOT NULL, method_label TEXT, account_label TEXT);",
        "CREATE TABLE IF NOT EXISTS idempotency_keys (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing', last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, key));",
        "CREATE TABLE IF NOT EXISTS order_invoice_overrides (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), order_id TEXT NOT NULL, einvoice_requested BOOLEAN NOT NULL DEFAULT false, id_type TEXT, id_number TEXT, fiscal_name TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, state TEXT, country TEXT, zip TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, order_id));",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS direction TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS message TEXT;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS request_json JSONB;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS response_json JSONB;",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
        "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;",
        "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_start INTEGER DEFAULT 0;",
        "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';",
        "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS provider TEXT;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS data_encrypted TEXT;",
        "ALTER TABLE credentials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS shop_domain TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS scopes TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS user_email TEXT;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS shopify_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS alegra_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS parent_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS metadata_json JSONB;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS warehouse_id TEXT;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS shopify_tax_id TEXT;",
        "ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS alegra_tax_id TEXT;",
        "ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS type TEXT;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS generate_invoice BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS resolution_id TEXT;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS cost_center_id TEXT;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS warehouse_id TEXT;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS seller_id TEXT;",
        "ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS source TEXT;",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT;",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_json JSONB;",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;",
        "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS method_id TEXT;",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS account_id TEXT;",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS method_label TEXT;",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS account_label TEXT;",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS key TEXT;",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS status TEXT;",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS last_error TEXT;",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS order_id TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS einvoice_requested BOOLEAN NOT NULL DEFAULT false;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS id_type TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS id_number TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS fiscal_name TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS email TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS phone TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS address TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS city TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS state TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS country TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS zip TEXT;",
        "ALTER TABLE order_invoice_overrides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
        "CREATE INDEX IF NOT EXISTS sync_mappings_shopify_idx ON sync_mappings (entity, shopify_id);",
        "CREATE INDEX IF NOT EXISTS sync_mappings_alegra_idx ON sync_mappings (entity, alegra_id);",
        "CREATE INDEX IF NOT EXISTS sync_logs_org_status_idx ON sync_logs (organization_id, status, created_at);",
        "CREATE INDEX IF NOT EXISTS webhook_events_source_type_idx ON webhook_events (source, event_type, received_at);",
        "CREATE UNIQUE INDEX IF NOT EXISTS retry_queue_sync_log_id_idx ON retry_queue (sync_log_id);",
        "CREATE INDEX IF NOT EXISTS retry_queue_status_next_idx ON retry_queue (status, next_run_at);",
        "CREATE INDEX IF NOT EXISTS sync_logs_order_id_idx ON sync_logs (organization_id, (request_json->>'orderId'), created_at DESC);",
        "CREATE INDEX IF NOT EXISTS sync_logs_entity_dir_idx ON sync_logs (organization_id, entity, direction, created_at DESC);",
      ];
      for (const query of queries) {
        try {
          await poolInstance.query(query);
        } catch (error: unknown) {
          console.error("DB repair query failed:", query, error);
        }
      }
      await poolInstance.query(
        "INSERT INTO organizations (id, name) VALUES (1, 'Default') ON CONFLICT DO NOTHING;"
      );
      dbReady = true;
    })().catch((error: unknown) => {
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
    const rawPool = new Pool({
      connectionString,
      ssl,
      options: "-c search_path=public",
    });
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
      .catch((error: unknown) => {
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
        CREATE TABLE IF NOT EXISTS inventory_rules (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE,
          min_stock INTEGER NOT NULL DEFAULT 0,
          warehouse_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
          auto_publish_status TEXT NOT NULL DEFAULT 'draft',
          inventory_adjustments_enabled BOOLEAN NOT NULL DEFAULT true
        )
        `
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE inventory_rules
            ADD COLUMN IF NOT EXISTS auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'draft',
            ADD COLUMN IF NOT EXISTS inventory_adjustments_enabled BOOLEAN NOT NULL DEFAULT true
          `
        )
      )
      .then(() => undefined)
      .catch((error: unknown) => {
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
          last_start BIGINT NOT NULL DEFAULT 0,
          total INTEGER,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, entity)
        )
        `
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE sync_checkpoints
            ALTER COLUMN last_start TYPE BIGINT
          `
        )
      )
      .then(() => undefined)
      .catch((error: unknown) => {
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
