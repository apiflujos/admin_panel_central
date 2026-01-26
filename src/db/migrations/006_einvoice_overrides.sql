ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS einvoice_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS order_invoice_overrides (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  order_id TEXT NOT NULL,
  einvoice_requested BOOLEAN NOT NULL DEFAULT false,
  id_type TEXT,
  id_number TEXT,
  fiscal_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, order_id)
);
