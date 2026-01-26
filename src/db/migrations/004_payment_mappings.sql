CREATE TABLE IF NOT EXISTS payment_mappings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  method_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  method_label TEXT,
  account_label TEXT
);
