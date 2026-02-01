CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credentials (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  provider TEXT NOT NULL,
  data_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopify_stores (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  shop_domain TEXT NOT NULL,
  store_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  scopes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopify_oauth_states (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  shop_domain TEXT NOT NULL,
  nonce TEXT NOT NULL,
  store_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alegra_accounts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  user_email TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_mappings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  entity TEXT NOT NULL,
  shopify_id TEXT,
  alegra_id TEXT,
  parent_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE inventory_rules (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  publish_on_stock BOOLEAN NOT NULL DEFAULT TRUE,
  min_stock INTEGER NOT NULL DEFAULT 0,
  warehouse_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tax_rules (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  shopify_tax_id TEXT NOT NULL,
  alegra_tax_id TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE invoice_settings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  generate_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_id TEXT,
  cost_center_id TEXT,
  warehouse_id TEXT,
  seller_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  entity TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  request_json JSONB,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE retry_queue (
  id SERIAL PRIMARY KEY,
  sync_log_id INTEGER NOT NULL REFERENCES sync_logs(id),
  next_run_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX sync_mappings_shopify_idx ON sync_mappings (entity, shopify_id);
CREATE INDEX sync_mappings_alegra_idx ON sync_mappings (entity, alegra_id);
CREATE INDEX sync_logs_org_status_idx ON sync_logs (organization_id, status, created_at);
CREATE INDEX webhook_events_source_type_idx ON webhook_events (source, event_type, received_at);
