-- 017_alegra_invoices.sql
-- Standalone catalog of Alegra invoices (independent of Shopify orders). The
-- existing invoices view derives from `orders` (a Shopify order invoiced in
-- Alegra); this table lets us list ALL Alegra invoices, including those that did
-- not originate from a Shopify order.

CREATE TABLE IF NOT EXISTS alegra_invoices (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL,
  store_id integer,
  alegra_invoice_id text NOT NULL,
  number text,
  date date,
  due_date date,
  client_name text,
  client_identification text,
  status text,
  is_electronic boolean DEFAULT false,
  subtotal numeric,
  tax numeric,
  total numeric,
  balance numeric,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS alegra_invoices_org_store_inv_idx
  ON alegra_invoices (organization_id, store_id, alegra_invoice_id);

CREATE INDEX IF NOT EXISTS alegra_invoices_org_date_idx
  ON alegra_invoices (organization_id, date DESC);
