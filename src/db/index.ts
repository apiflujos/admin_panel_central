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
        "CREATE TABLE IF NOT EXISTS shopify_stores (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL, store_name TEXT, access_token_encrypted TEXT NOT NULL, scopes TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS shopify_oauth_states (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL, nonce TEXT NOT NULL, store_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS oauth_states (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), provider TEXT NOT NULL, nonce TEXT NOT NULL, payload_json JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS alegra_accounts (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), user_email TEXT NOT NULL, api_key_encrypted TEXT NOT NULL, environment TEXT DEFAULT 'prod', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS sync_mappings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), entity TEXT NOT NULL, shopify_id TEXT, alegra_id TEXT, parent_id TEXT, metadata_json JSONB NOT NULL DEFAULT '{}');",
        "CREATE TABLE IF NOT EXISTS contacts (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'shopify', shopify_id TEXT, alegra_id TEXT, name TEXT, email TEXT, phone TEXT, doc TEXT, address TEXT, sync_status TEXT NOT NULL DEFAULT 'pending', last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'shopify', shopify_order_id TEXT, alegra_invoice_id TEXT, shopify_order_number TEXT, customer_name TEXT, customer_email TEXT, products_summary TEXT, processed_at TIMESTAMPTZ, status TEXT, total NUMERIC, currency TEXT, alegra_status TEXT, invoice_number TEXT, source_updated_at TIMESTAMPTZ, sync_status TEXT NOT NULL DEFAULT 'pending', last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'alegra', alegra_item_id TEXT, shopify_product_id TEXT, name TEXT, reference TEXT, sku TEXT, status_alegra TEXT, status_shopify TEXT, inventory_quantity NUMERIC, warehouse_ids TEXT[], source_updated_at TIMESTAMPTZ, sync_status TEXT NOT NULL DEFAULT 'pending', last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS shop_domain TEXT NOT NULL DEFAULT '';",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_domain TEXT NOT NULL DEFAULT '';",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_domain TEXT NOT NULL DEFAULT '';",
        "DROP INDEX IF EXISTS products_org_alegra_idx;",
        "DROP INDEX IF EXISTS products_org_shopify_idx;",
        "CREATE UNIQUE INDEX IF NOT EXISTS products_org_alegra_store_idx ON products (organization_id, shop_domain, alegra_item_id);",
        "CREATE UNIQUE INDEX IF NOT EXISTS products_org_shopify_store_idx ON products (organization_id, shop_domain, shopify_product_id);",
        "CREATE INDEX IF NOT EXISTS products_org_ref_idx ON products (organization_id, reference);",
        "CREATE INDEX IF NOT EXISTS products_org_sku_idx ON products (organization_id, sku);",
        "CREATE INDEX IF NOT EXISTS products_org_updated_idx ON products (organization_id, updated_at DESC);",
        "CREATE INDEX IF NOT EXISTS orders_org_updated_idx ON orders (organization_id, updated_at DESC);",
        "CREATE INDEX IF NOT EXISTS orders_org_processed_idx ON orders (organization_id, processed_at DESC);",
        "CREATE TABLE IF NOT EXISTS inventory_rules (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE, min_stock INTEGER NOT NULL DEFAULT 0, warehouse_id TEXT, warehouse_ids TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), only_active_items BOOLEAN NOT NULL DEFAULT false);",
        "CREATE TABLE IF NOT EXISTS tax_rules (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shopify_tax_id TEXT NOT NULL, alegra_tax_id TEXT NOT NULL, type TEXT NOT NULL);",
        "CREATE TABLE IF NOT EXISTS invoice_settings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), generate_invoice BOOLEAN NOT NULL DEFAULT FALSE, resolution_id TEXT, cost_center_id TEXT, warehouse_id TEXT, seller_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS invoice_documents (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL DEFAULT '', alegra_invoice_id TEXT NOT NULL, invoice_number TEXT, content_type TEXT NOT NULL DEFAULT 'application/pdf', content BYTEA NOT NULL, fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, alegra_invoice_id));",
        "CREATE TABLE IF NOT EXISTS webhook_events (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), source TEXT NOT NULL, event_type TEXT NOT NULL, payload_json JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'pending');",
        "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), entity TEXT NOT NULL, direction TEXT NOT NULL, status TEXT NOT NULL, message TEXT, request_json JSONB, response_json JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), retry_count INTEGER NOT NULL DEFAULT 0);",
        "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY, sync_log_id INTEGER NOT NULL REFERENCES sync_logs(id), next_run_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'pending');",
        "CREATE TABLE IF NOT EXISTS sync_checkpoints (id SERIAL PRIMARY KEY);",
        "CREATE TABLE IF NOT EXISTS alegra_items_cache (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), alegra_item_id TEXT NOT NULL, name TEXT, reference TEXT, barcode TEXT, status TEXT, inventory_quantity NUMERIC, warehouse_ids TEXT[], item_json JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, alegra_item_id));",
        "CREATE TABLE IF NOT EXISTS payment_mappings (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), method_id TEXT NOT NULL, account_id TEXT NOT NULL, method_label TEXT, account_label TEXT, payment_method TEXT, payment_method_label TEXT);",
        "CREATE TABLE IF NOT EXISTS idempotency_keys (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing', last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, key));",
        "CREATE TABLE IF NOT EXISTS order_invoice_overrides (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), order_id TEXT NOT NULL, einvoice_requested BOOLEAN NOT NULL DEFAULT false, id_type TEXT, id_number TEXT, fiscal_name TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, state TEXT, country TEXT, zip TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (organization_id, order_id));",
        "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'agent', name TEXT, phone TEXT, photo_base64 TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;",
        "CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_idx ON users (organization_id, email);",
        "CREATE INDEX IF NOT EXISTS users_super_admin_email_idx ON users (lower(email)) WHERE is_super_admin = true;",
        "CREATE TABLE IF NOT EXISTS user_sessions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), token TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions (token);",
        "CREATE TABLE IF NOT EXISTS company_profiles (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), name TEXT, phone TEXT, address TEXT, logo_base64 TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE TABLE IF NOT EXISTS shopify_store_configs (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT NOT NULL, transfer_destination_warehouse_id TEXT, transfer_origin_warehouse_ids TEXT, transfer_priority_warehouse_id TEXT, transfer_strategy TEXT NOT NULL DEFAULT 'consolidation', price_list_general_id TEXT, price_list_discount_id TEXT, price_list_wholesale_id TEXT, currency TEXT, alegra_account_id INTEGER, config_json JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
        "CREATE UNIQUE INDEX IF NOT EXISTS shopify_store_configs_domain_idx ON shopify_store_configs (organization_id, shop_domain);",
        "CREATE TABLE IF NOT EXISTS inventory_transfer_decisions (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), shop_domain TEXT, order_id TEXT, chosen_warehouse_id TEXT, rule TEXT, details_json JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());",
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
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS store_name TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS scopes TEXT;",
        "ALTER TABLE shopify_stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE shopify_oauth_states ADD COLUMN IF NOT EXISTS store_name TEXT;",
        "CREATE UNIQUE INDEX IF NOT EXISTS shopify_stores_domain_idx ON shopify_stores (organization_id, shop_domain);",
        "CREATE INDEX IF NOT EXISTS shopify_oauth_states_org_idx ON shopify_oauth_states (organization_id, shop_domain);",
        "CREATE INDEX IF NOT EXISTS oauth_states_org_provider_idx ON oauth_states (organization_id, provider, nonce);",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS user_email TEXT;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'prod';",
        "ALTER TABLE alegra_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE shopify_store_configs ADD COLUMN IF NOT EXISTS alegra_account_id INTEGER;",
        "ALTER TABLE shopify_store_configs ADD COLUMN IF NOT EXISTS config_json JSONB;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS entity TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS shopify_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS alegra_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS parent_id TEXT;",
        "ALTER TABLE sync_mappings ADD COLUMN IF NOT EXISTS metadata_json JSONB;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS products_summary TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS alegra_status TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_ids TEXT[];",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS status_shopify TEXT;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS status_alegra TEXT;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_quantity NUMERIC;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS organization_id INTEGER;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS warehouse_id TEXT;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS warehouse_ids TEXT;",
        "ALTER TABLE inventory_rules ADD COLUMN IF NOT EXISTS only_active_items BOOLEAN NOT NULL DEFAULT false;",
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
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS payment_method TEXT;",
        "ALTER TABLE payment_mappings ADD COLUMN IF NOT EXISTS payment_method_label TEXT;",
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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_base64 TEXT;",
        "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW();",
        "CREATE INDEX IF NOT EXISTS sync_mappings_shopify_idx ON sync_mappings (entity, shopify_id);",
        "CREATE INDEX IF NOT EXISTS sync_mappings_alegra_idx ON sync_mappings (entity, alegra_id);",
        "DROP INDEX IF EXISTS contacts_shopify_idx;",
        "DROP INDEX IF EXISTS contacts_alegra_idx;",
        "DROP INDEX IF EXISTS orders_shopify_idx;",
        "DROP INDEX IF EXISTS orders_alegra_idx;",
        "CREATE UNIQUE INDEX IF NOT EXISTS contacts_shopify_store_idx ON contacts (organization_id, shop_domain, shopify_id);",
        "CREATE UNIQUE INDEX IF NOT EXISTS contacts_alegra_store_idx ON contacts (organization_id, shop_domain, alegra_id);",
        "CREATE UNIQUE INDEX IF NOT EXISTS orders_shopify_store_idx ON orders (organization_id, shop_domain, shopify_order_id);",
        "CREATE UNIQUE INDEX IF NOT EXISTS orders_alegra_store_idx ON orders (organization_id, shop_domain, alegra_invoice_id);",
        "CREATE INDEX IF NOT EXISTS invoice_documents_org_updated_idx ON invoice_documents (organization_id, updated_at DESC);",
        "CREATE INDEX IF NOT EXISTS sync_logs_org_status_idx ON sync_logs (organization_id, status, created_at);",
        "CREATE INDEX IF NOT EXISTS webhook_events_source_type_idx ON webhook_events (source, event_type, received_at);",
        "CREATE UNIQUE INDEX IF NOT EXISTS retry_queue_sync_log_id_idx ON retry_queue (sync_log_id);",
        "CREATE INDEX IF NOT EXISTS retry_queue_status_next_idx ON retry_queue (status, next_run_at);",
        "CREATE INDEX IF NOT EXISTS sync_logs_order_id_idx ON sync_logs (organization_id, (request_json->>'orderId'), created_at DESC);",
        "CREATE INDEX IF NOT EXISTS sync_logs_entity_dir_idx ON sync_logs (organization_id, entity, direction, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS alegra_items_cache_org_idx ON alegra_items_cache (organization_id);",
        "CREATE INDEX IF NOT EXISTS alegra_items_cache_org_updated_idx ON alegra_items_cache (organization_id, updated_at DESC);",
        "CREATE INDEX IF NOT EXISTS alegra_items_cache_ref_idx ON alegra_items_cache (organization_id, reference);",
        "CREATE INDEX IF NOT EXISTS alegra_items_cache_name_idx ON alegra_items_cache (organization_id, name);",
        "CREATE INDEX IF NOT EXISTS alegra_items_cache_warehouse_idx ON alegra_items_cache USING GIN (warehouse_ids);",

        // --- Marketing module (schema: marketing) ---
        "CREATE SCHEMA IF NOT EXISTS marketing;",
        `CREATE TABLE IF NOT EXISTS marketing.shops (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          shopify_store_id INTEGER REFERENCES shopify_stores(id),
          currency TEXT NOT NULL DEFAULT 'COP',
          timezone TEXT NOT NULL DEFAULT 'UTC',
          pixel_key TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain)
        );`,
        "ALTER TABLE marketing.shops ADD COLUMN IF NOT EXISTS pixel_key TEXT;",
        "CREATE UNIQUE INDEX IF NOT EXISTS marketing_shops_org_pixel_key_uidx ON marketing.shops (organization_id, pixel_key) WHERE pixel_key IS NOT NULL;",
        `CREATE TABLE IF NOT EXISTS marketing.customers (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          shopify_customer_gid TEXT NOT NULL,
          email TEXT,
          first_name TEXT,
          last_name TEXT,
          phone TEXT,
          created_at_shopify TIMESTAMPTZ,
          updated_at_shopify TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, shopify_customer_gid)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.products (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          shopify_product_gid TEXT NOT NULL,
          title TEXT,
          status TEXT,
          vendor TEXT,
          product_type TEXT,
          tags TEXT[],
          created_at_shopify TIMESTAMPTZ,
          updated_at_shopify TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, shopify_product_gid)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.orders (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          shopify_order_gid TEXT NOT NULL,
          order_name TEXT,
          created_at_shopify TIMESTAMPTZ,
          processed_at_shopify TIMESTAMPTZ,
          financial_status TEXT,
          total_amount NUMERIC,
          currency TEXT,
          customer_gid TEXT,
          customer_email TEXT,
          discount_codes TEXT[],
          tags TEXT[],
          landing_site TEXT,
          referrer TEXT,
          utm_source TEXT,
          utm_medium TEXT,
          utm_campaign TEXT,
          utm_content TEXT,
          inferred_channel TEXT,
          raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, shopify_order_gid)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.order_items (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          shopify_order_gid TEXT NOT NULL,
          shopify_product_gid TEXT,
          product_title TEXT,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit_price NUMERIC,
          line_amount NUMERIC,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.campaigns (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          utm_source TEXT NOT NULL DEFAULT '',
          utm_medium TEXT NOT NULL DEFAULT '',
          utm_campaign TEXT NOT NULL,
          utm_content TEXT NOT NULL DEFAULT '',
          name TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          cost_amount NUMERIC,
          currency TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.campaign_spend (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          date DATE NOT NULL,
          utm_campaign TEXT NOT NULL,
          amount NUMERIC NOT NULL DEFAULT 0,
          currency TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, date, utm_campaign)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.traffic_sources (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          utm_source TEXT NOT NULL,
          utm_medium TEXT NOT NULL,
          channel TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, utm_source, utm_medium)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.attribution_events (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          event_type TEXT NOT NULL,
          occurred_at TIMESTAMPTZ NOT NULL,
          shopify_checkout_token TEXT,
          shopify_order_gid TEXT,
          customer_email TEXT,
          landing_site TEXT,
          referrer TEXT,
          utm_source TEXT,
          utm_medium TEXT,
          utm_campaign TEXT,
          utm_content TEXT,
          inferred_channel TEXT,
          value_amount NUMERIC,
          currency TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.daily_metrics (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          date DATE NOT NULL,
          channel TEXT NOT NULL DEFAULT 'unknown',
          utm_campaign TEXT NOT NULL DEFAULT '',
          sessions INTEGER NOT NULL DEFAULT 0,
          add_to_cart INTEGER NOT NULL DEFAULT 0,
          checkouts INTEGER NOT NULL DEFAULT 0,
          paid_orders INTEGER NOT NULL DEFAULT 0,
          revenue NUMERIC NOT NULL DEFAULT 0,
          aov NUMERIC,
          new_customers INTEGER NOT NULL DEFAULT 0,
          repeat_customers INTEGER NOT NULL DEFAULT 0,
          cac NUMERIC,
          cpa NUMERIC,
          roas NUMERIC,
          ltv NUMERIC,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, date, channel, utm_campaign)
        );`,
        // Ensure conflict targets are valid and stable (no expression-based UNIQUE constraints).
        "ALTER TABLE IF EXISTS marketing.campaigns ALTER COLUMN utm_source SET DEFAULT '';",
        "ALTER TABLE IF EXISTS marketing.campaigns ALTER COLUMN utm_medium SET DEFAULT '';",
        "ALTER TABLE IF EXISTS marketing.campaigns ALTER COLUMN utm_content SET DEFAULT '';",
        "ALTER TABLE IF EXISTS marketing.daily_metrics ALTER COLUMN utm_campaign SET DEFAULT '';",
        `CREATE TABLE IF NOT EXISTS marketing.alert_rules (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          name TEXT NOT NULL,
          rule_type TEXT NOT NULL,
          threshold NUMERIC,
          window_days INTEGER NOT NULL DEFAULT 7,
          enabled BOOLEAN NOT NULL DEFAULT true,
          notify_email TEXT,
          notify_webhook_url TEXT,
          notify_whatsapp TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.alerts (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          rule_id BIGINT REFERENCES marketing.alert_rules(id),
          date DATE,
          severity TEXT NOT NULL DEFAULT 'warn',
          message TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          acknowledged BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.webhook_receipts (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          webhook_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          payload_hash TEXT,
          processed_at TIMESTAMPTZ,
          UNIQUE (organization_id, shop_domain, webhook_id)
        );`,
        `CREATE TABLE IF NOT EXISTS marketing.sync_state (
          id BIGSERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          shop_domain TEXT NOT NULL,
          entity TEXT NOT NULL,
          cursor TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (organization_id, shop_domain, entity)
        );`,
        "CREATE INDEX IF NOT EXISTS marketing_orders_org_shop_processed_idx ON marketing.orders (organization_id, shop_domain, processed_at_shopify DESC);",
        "CREATE INDEX IF NOT EXISTS marketing_orders_utm_idx ON marketing.orders (organization_id, shop_domain, utm_campaign, utm_source, utm_medium);",
        "CREATE INDEX IF NOT EXISTS marketing_events_org_shop_time_idx ON marketing.attribution_events (organization_id, shop_domain, occurred_at DESC);",
        "CREATE INDEX IF NOT EXISTS marketing_daily_org_shop_date_idx ON marketing.daily_metrics (organization_id, shop_domain, date DESC);",
        "CREATE INDEX IF NOT EXISTS marketing_spend_org_shop_date_idx ON marketing.campaign_spend (organization_id, shop_domain, date DESC);",

        // --- Super Admin / Billing module (schema: sa) ---
        "CREATE SCHEMA IF NOT EXISTS sa;",
        `CREATE TABLE IF NOT EXISTS sa.limit_definitions (
          key TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          period_type TEXT NOT NULL DEFAULT 'monthly',
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS sa.module_definitions (
          key TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS sa.tenant_modules (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          module_key TEXT NOT NULL REFERENCES sa.module_definitions(key),
          enabled BOOLEAN NOT NULL DEFAULT true,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, module_key)
        );`,
        `CREATE TABLE IF NOT EXISTS sa.plan_definitions (
          id BIGSERIAL PRIMARY KEY,
          key TEXT NOT NULL,
          name TEXT NOT NULL,
          plan_type TEXT NOT NULL,
          monthly_price NUMERIC NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (key)
        );`,
        `CREATE TABLE IF NOT EXISTS sa.plan_service_limits (
          id BIGSERIAL PRIMARY KEY,
          plan_id BIGINT NOT NULL REFERENCES sa.plan_definitions(id),
          service_key TEXT NOT NULL REFERENCES sa.limit_definitions(key),
          is_unlimited BOOLEAN NOT NULL DEFAULT false,
          max_value NUMERIC,
          unit_price NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (plan_id, service_key)
        );`,
        `CREATE TABLE IF NOT EXISTS sa.tenant_plans (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          plan_id BIGINT NOT NULL REFERENCES sa.plan_definitions(id),
          snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id)
        );`,
        `CREATE TABLE IF NOT EXISTS sa.usage_events (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          service_key TEXT NOT NULL REFERENCES sa.limit_definitions(key),
          amount NUMERIC NOT NULL DEFAULT 1,
          period_key TEXT NOT NULL,
          source TEXT,
          meta JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS sa.usage_counters (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          service_key TEXT NOT NULL REFERENCES sa.limit_definitions(key),
          period_key TEXT NOT NULL,
          total NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, service_key, period_key)
        );`,
        `CREATE TABLE IF NOT EXISTS sa.billing_events (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          service_key TEXT NOT NULL REFERENCES sa.limit_definitions(key),
          quantity NUMERIC NOT NULL DEFAULT 0,
          unit_price NUMERIC NOT NULL DEFAULT 0,
          total NUMERIC NOT NULL DEFAULT 0,
          period_key TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS sa.billing_counters (
          id BIGSERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES organizations(id),
          service_key TEXT NOT NULL REFERENCES sa.limit_definitions(key),
          period_key TEXT NOT NULL,
          quantity NUMERIC NOT NULL DEFAULT 0,
          total NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, service_key, period_key)
        );`,
        "CREATE INDEX IF NOT EXISTS sa_usage_events_tenant_period_idx ON sa.usage_events (tenant_id, period_key, created_at DESC);",
        "CREATE INDEX IF NOT EXISTS sa_billing_events_tenant_period_idx ON sa.billing_events (tenant_id, period_key, created_at DESC);",
      ];
      for (const query of queries) {
        try {
          await poolInstance.query(query);
        } catch (error: unknown) {
          console.error("DB repair query failed:", query, error);
        }
      }

      // Backfill: if there is only one Shopify store, assign it as default shop_domain for legacy rows.
      try {
        const orgId = Number(process.env.APP_ORG_ID || 1);
        const stores = await poolInstance.query<{ shop_domain: string }>(
          `
          SELECT DISTINCT shop_domain
          FROM shopify_stores
          WHERE organization_id = $1
          `,
          [orgId]
        );
        const uniqueDomains = stores.rows
          .map((row) => String(row.shop_domain || "").trim())
          .filter(Boolean);
        if (uniqueDomains.length === 1) {
          const domain = uniqueDomains[0];
          await poolInstance.query(
            `UPDATE products SET shop_domain = $1 WHERE organization_id = $2 AND (shop_domain IS NULL OR shop_domain = '')`,
            [domain, orgId]
          );
          await poolInstance.query(
            `UPDATE orders SET shop_domain = $1 WHERE organization_id = $2 AND (shop_domain IS NULL OR shop_domain = '')`,
            [domain, orgId]
          );
          await poolInstance.query(
            `UPDATE contacts SET shop_domain = $1 WHERE organization_id = $2 AND (shop_domain IS NULL OR shop_domain = '')`,
            [domain, orgId]
          );
        }
      } catch (error: unknown) {
        console.error("DB shop_domain backfill failed:", error);
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
    void performRepair(rawPool).catch((error: unknown) => {
      console.error("DB repair failed:", error);
    });
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
let ensureUsersPromise: Promise<void> | null = null;

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
          warehouse_ids TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
          auto_publish_status TEXT NOT NULL DEFAULT 'draft',
          inventory_adjustments_enabled BOOLEAN NOT NULL DEFAULT true,
          inventory_adjustments_interval_minutes INTEGER NOT NULL DEFAULT 5,
          inventory_adjustments_autopublish BOOLEAN NOT NULL DEFAULT true,
          only_active_items BOOLEAN NOT NULL DEFAULT false
        )
        `
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE inventory_rules
            ADD COLUMN IF NOT EXISTS auto_publish_on_webhook BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS auto_publish_status TEXT NOT NULL DEFAULT 'draft',
            ADD COLUMN IF NOT EXISTS inventory_adjustments_enabled BOOLEAN NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS inventory_adjustments_interval_minutes INTEGER NOT NULL DEFAULT 5,
            ADD COLUMN IF NOT EXISTS inventory_adjustments_autopublish BOOLEAN NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS warehouse_ids TEXT,
            ADD COLUMN IF NOT EXISTS only_active_items BOOLEAN NOT NULL DEFAULT false
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

export async function ensureUsersTables(poolInstance: Pool) {
  if (!dbReady && repairPromise) {
    await repairPromise;
  }
  if (!ensureUsersPromise) {
    ensureUsersPromise = poolInstance
      .query(
        `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'agent',
          is_super_admin BOOLEAN NOT NULL DEFAULT false,
          name TEXT,
          phone TEXT,
          photo_base64 TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        `
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'agent',
            ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS name TEXT,
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS photo_base64 TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_idx ON users (organization_id, email)
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          -- Normalize legacy/invalid roles before enforcing constraints.
          UPDATE users
          SET role = 'super_admin'
          WHERE role = 'superadmin';
          UPDATE users
          SET role = 'agent'
          WHERE role IS NULL OR role NOT IN ('admin','agent','super_admin','superadmin');

          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
          ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin','agent','super_admin','superadmin'));
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          CREATE INDEX IF NOT EXISTS users_super_admin_email_idx
          ON users (lower(email))
          WHERE is_super_admin = true
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE user_sessions
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          ALTER TABLE user_sessions
            ALTER COLUMN expires_at DROP NOT NULL
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions (token)
          `
        )
      )
      .then(() =>
        poolInstance.query(
          `
          CREATE TABLE IF NOT EXISTS company_profiles (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id),
            name TEXT,
            phone TEXT,
            address TEXT,
            logo_base64 TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
          `
        )
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        ensureUsersPromise = null;
        throw error;
      });
  }
  await ensureUsersPromise;
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
