CREATE TABLE IF NOT EXISTS webhook_receipts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  source TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  topic TEXT,
  shop_domain TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, source, webhook_id)
);

CREATE INDEX IF NOT EXISTS webhook_receipts_received_at_idx
  ON webhook_receipts (received_at);
